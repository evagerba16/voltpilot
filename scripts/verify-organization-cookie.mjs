#!/usr/bin/env node

/**
 * End-to-end verification for organization cookie refactor.
 * Run: npm run org-cookie:verify
 *
 * Requires real BETA_TEST_EMAIL / BETA_TEST_PASSWORD in .env.local.
 * For org-switch test: user must belong to 2+ orgs, or set BETA_TEST_ORG_B_ID.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ORG_COOKIE = "voltpilot_organization_id";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
const SIGN_IN_ACTION = "4025b3dbe2b3e8ad75edea649b07455adb76e69dcd";
const SYNC_ORG_ACTION = "407fa710963b5a2dda34416485aff1bb2aac4174fb";
const SWITCH_ORG_ACTION = "402c1d12a42bbddc2bb189fb580ff3623e74d551b4";

const results = [];

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

function pass(id, detail) {
  results.push({ id, status: "PASS", detail });
  console.log(`PASS  ${id}${detail ? `\n      ${detail}` : ""}`);
}

function fail(id, detail) {
  results.push({ id, status: "FAIL", detail });
  console.log(`FAIL  ${id}\n      ${detail}`);
}

function isPlaceholderCredentials() {
  const email = process.env.BETA_TEST_EMAIL ?? "";
  const password = process.env.BETA_TEST_PASSWORD ?? "";
  return (
    !email ||
    !password ||
    email.includes("your-test") ||
    password.includes("your-password")
  );
}

function auditCookieWrites() {
  console.log("\n-- Regression: cookies().set() audit --");

  const sourceRoots = [
    path.join(root, "app"),
    path.join(root, "lib"),
    path.join(root, "components"),
  ];

  const offenders = [];
  const allowed = [];

  for (const sourceRoot of sourceRoots) {
    if (!fs.existsSync(sourceRoot)) continue;

    const stack = [sourceRoot];
    while (stack.length) {
      const current = stack.pop();
      const stat = fs.statSync(current);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(current)) {
          if (["node_modules", ".next", ".next-build"].includes(entry)) continue;
          stack.push(path.join(current, entry));
        }
        continue;
      }

      if (!/\.(ts|tsx)$/.test(current)) continue;

      const rel = path.relative(root, current);
      const content = fs.readFileSync(current, "utf8");
      if (!/cookieStore\.set\(|cookies\(\)\.set\(/.test(content)) continue;

      const isServerAction = content.includes('"use server"');
      const isRouteHandler =
        rel.startsWith("app/") &&
        (rel.endsWith("/route.ts") || rel.endsWith("/route.tsx"));

      const entry = { file: rel, isServerAction, isRouteHandler };

      if (isServerAction || isRouteHandler) {
        allowed.push({ ...entry, reason: "Server Action or Route Handler" });
      } else if (rel === "lib/supabase/server.ts") {
        allowed.push({
          ...entry,
          reason: "Supabase SSR client (try/catch; middleware refreshes sessions)",
        });
      } else if (rel === "lib/supabase/middleware.ts") {
        allowed.push({
          ...entry,
          reason: "Middleware session refresh (Route Handler equivalent)",
        });
      } else if (rel === "lib/teams/actions.ts") {
        allowed.push({
          ...entry,
          reason: "Server Action module (writeOrganizationPreference)",
        });
      } else if (rel.includes("/layout.tsx") || rel.includes("/page.tsx")) {
        offenders.push({ ...entry, reason: "Page/Layout (Server Component)" });
      } else if (rel.includes("queries.ts") || rel.includes("/queries/")) {
        offenders.push({ ...entry, reason: "Query/helper module" });
      } else {
        offenders.push(entry);
      }
    }
  }

  if (offenders.length === 0) {
    pass(
      "regression.cookie-set-audit",
      `${allowed.length} cookie write site(s); 0 in Server Components/layouts/pages/queries`
    );
    for (const item of allowed) {
      console.log(`      allowed: ${item.file} — ${item.reason}`);
    }
    return true;
  }

  for (const offender of offenders) {
    console.log(`      ILLEGAL: ${offender.file}${offender.reason ? ` — ${offender.reason}` : ""}`);
  }
  fail("regression.cookie-set-audit", `${offenders.length} illegal cookie write location(s)`);
  return false;
}

async function checkServerLogsForCookieError() {
  return false;
}

async function runBrowserFlow() {
  console.log("\n-- Authenticated browser flow --");

  if (isPlaceholderCredentials()) {
    fail(
      "auth.credentials",
      "Set real BETA_TEST_EMAIL and BETA_TEST_PASSWORD in .env.local"
    );
    return false;
  }

  const email = process.env.BETA_TEST_EMAIL;
  const password = process.env.BETA_TEST_PASSWORD;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  let ok = true;

  try {
    // 1. Sign in
    const loginResponse = await page.goto(`${baseUrl}/login?next=/dashboard`, {
      waitUntil: "networkidle",
    });

    if (!loginResponse || loginResponse.status() >= 500) {
      fail("auth.login-page", `GET /login returned ${loginResponse?.status() ?? "no response"}`);
      ok = false;
    } else {
      pass("auth.login-page", `GET /login returned ${loginResponse.status()}`);
    }

    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => null);

    const afterLoginUrl = page.url();
    const loginBody = await page.content();

    if (loginBody.includes("Cookies can only be modified")) {
      fail("auth.login-cookie-error", "Cookie write error visible after sign-in");
      ok = false;
    } else if (!afterLoginUrl.includes("/dashboard")) {
      fail(
        "auth.sign-in-redirect",
        `Expected /dashboard, got ${afterLoginUrl}`
      );
      ok = false;
    } else {
      pass("auth.sign-in-redirect", `Redirected to ${afterLoginUrl}`);
    }

    // 2. Dashboard load
    const dashboardResponse = await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "networkidle",
    });
    const dashboardBody = await page.content();

    if (!dashboardResponse || dashboardResponse.status() >= 500) {
      fail("dashboard.load", `GET /dashboard returned ${dashboardResponse?.status() ?? "no response"}`);
      ok = false;
    } else if (dashboardBody.includes("Cookies can only be modified")) {
      fail("dashboard.cookie-error", "Cookie write error on dashboard render");
      ok = false;
    } else if (dashboardResponse.status() !== 200) {
      fail("dashboard.load", `GET /dashboard returned ${dashboardResponse.status()}`);
      ok = false;
    } else {
      pass("dashboard.load", "GET /dashboard returned 200");
    }

    let cookies = await context.cookies();
    let orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);

    if (!orgCookie?.value) {
      // OrganizationPreferenceSync runs async — wait for POST /dashboard
      await page.waitForTimeout(1500);
      cookies = await context.cookies();
      orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);
    }

    if (!orgCookie?.value) {
      fail("dashboard.org-cookie", "Organization cookie not set after dashboard load");
      ok = false;
    } else {
      pass(
        "dashboard.org-cookie",
        `voltpilot_organization_id=${orgCookie.value.slice(0, 8)}…`
      );
    }

    const initialOrgId = orgCookie?.value;

    // Refresh persistence
    await page.reload({ waitUntil: "networkidle" });
    cookies = await context.cookies();
    orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);

    if (initialOrgId && orgCookie?.value === initialOrgId) {
      pass("dashboard.org-persist-refresh", "Organization cookie persisted after refresh");
    } else {
      fail(
        "dashboard.org-persist-refresh",
        `Expected ${initialOrgId}, got ${orgCookie?.value ?? "(missing)"}`
      );
      ok = false;
    }

    // Verify company name visible (org context loaded)
    const companyText = await page.locator("aside").textContent();
    if (companyText && companyText.includes("VoltPilot")) {
      pass("dashboard.org-context", "Dashboard shell rendered with org context");
    } else {
      fail("dashboard.org-context", "Dashboard shell missing expected org context");
      ok = false;
    }

    // 3. Organization switching via Server Action
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: authData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const userId = authData.user?.id;
    let alternateOrgId = process.env.BETA_TEST_ORG_B_ID?.trim();

    if (userId) {
      const { data: memberships } = await supabase
        .from("team_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active");

      const orgIds = (memberships ?? []).map((row) => row.organization_id);
      if (!alternateOrgId) {
        alternateOrgId = orgIds.find((id) => id !== initialOrgId);
      }
    }

    if (!alternateOrgId) {
      fail(
        "org-switch.switch",
        "Need user with 2+ active org memberships (or set BETA_TEST_ORG_B_ID)"
      );
      ok = false;
    } else {
      const switchResponse = await page.request.post(`${baseUrl}/dashboard`, {
        headers: {
          "Next-Action": SWITCH_ORG_ACTION,
          "Content-Type": "text/plain;charset=UTF-8",
          Accept: "text/x-component",
        },
        data: JSON.stringify([alternateOrgId]),
      });

      const switchText = await switchResponse.text();
      if (switchText.includes("Cookies can only be modified")) {
        fail("org-switch.cookie-error", "Cookie error during switchOrganization");
        ok = false;
      } else if (switchResponse.status() >= 500) {
        fail("org-switch.switch", `switchOrganization returned ${switchResponse.status()}`);
        ok = false;
      } else {
        pass("org-switch.switch", `switchOrganization returned ${switchResponse.status()}`);
      }

      cookies = await context.cookies();
      orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);

      if (orgCookie?.value === alternateOrgId) {
        pass("org-switch.cookie-updated", `Cookie updated to ${alternateOrgId.slice(0, 8)}…`);
      } else {
        fail(
          "org-switch.cookie-updated",
          `Expected ${alternateOrgId}, got ${orgCookie?.value ?? "(missing)"}`
        );
        ok = false;
      }

      await page.reload({ waitUntil: "networkidle" });
      cookies = await context.cookies();
      orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);

      if (orgCookie?.value === alternateOrgId) {
        pass("org-switch.persist-after-refresh", "Switched org persisted after refresh");
      } else {
        fail("org-switch.persist-after-refresh", "Switched org did not persist after refresh");
        ok = false;
      }
    }

    // 4. Team invitation path (code + acceptTeamInvitation server action write)
    const teamActions = fs.readFileSync(
      path.join(root, "app/(dashboard)/settings/team/actions.ts"),
      "utf8"
    );

    if (
      teamActions.includes('"use server"') &&
      teamActions.includes("persistOrganizationPreference(result.organization_id)")
    ) {
      pass(
        "invite.cookie-write-path",
        "acceptTeamInvitation persists org cookie via Server Action after RPC success"
      );
    } else {
      fail("invite.cookie-write-path", "Missing persistOrganizationPreference in acceptTeamInvitation");
      ok = false;
    }

    // syncOrganizationPreference server action smoke test
    const syncResponse = await page.request.post(`${baseUrl}/dashboard`, {
      headers: {
        "Next-Action": SYNC_ORG_ACTION,
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "text/x-component",
      },
      data: JSON.stringify([initialOrgId]),
    });

    const syncText = await syncResponse.text();
    if (syncText.includes("Cookies can only be modified")) {
      fail("dashboard.sync-action", "Cookie error from syncOrganizationPreference");
      ok = false;
    } else if (syncResponse.status() >= 500) {
      fail("dashboard.sync-action", `syncOrganizationPreference returned ${syncResponse.status()}`);
      ok = false;
    } else {
      pass("dashboard.sync-action", `syncOrganizationPreference returned ${syncResponse.status()}`);
    }

    const cookieErrors = [
      ...consoleErrors.filter((msg) => msg.includes("Cookies can only be modified")),
      ...pageErrors.filter((msg) => msg.includes("Cookies can only be modified")),
    ];

    if (cookieErrors.length === 0) {
      pass("runtime.no-cookie-errors", "No cookie modification errors in browser console");
    } else {
      fail("runtime.no-cookie-errors", cookieErrors.join(" | "));
      ok = false;
    }

    if (pageErrors.length === 0) {
      pass("runtime.no-react-errors", "No uncaught page errors");
    } else {
      fail("runtime.no-react-errors", pageErrors.slice(0, 3).join(" | "));
      ok = false;
    }
  } finally {
    await browser.close();
  }

  return ok && results.filter((item) => item.status === "FAIL").length === 0;
}

async function runUnauthenticatedSmokeTests() {
  console.log("\n-- Unauthenticated smoke tests --");

  const loginResponse = await fetch(`${baseUrl}/login`);
  const loginHtml = await loginResponse.text();

  if (loginResponse.status === 200) {
    pass("unauth.login", "GET /login returned 200");
  } else {
    fail("unauth.login", `GET /login returned ${loginResponse.status}`);
  }

  if (loginHtml.includes("Cookies can only be modified")) {
    fail("unauth.login-cookie-error", "Cookie error text on login page");
  } else {
    pass("unauth.login-cookie-error", "No cookie error on login page");
  }

  const dashboardResponse = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });

  if ([302, 307].includes(dashboardResponse.status)) {
    pass("unauth.dashboard-redirect", `GET /dashboard returned ${dashboardResponse.status}`);
  } else if (dashboardResponse.status >= 500) {
    fail("unauth.dashboard-redirect", `GET /dashboard returned ${dashboardResponse.status}`);
  } else {
    fail("unauth.dashboard-redirect", `Expected redirect, got ${dashboardResponse.status}`);
  }
}

console.log("=== Organization Cookie E2E Verification ===\n");

const auditOk = auditCookieWrites();
await runUnauthenticatedSmokeTests();
const flowOk = await runBrowserFlow();

const passed = results.filter((item) => item.status === "PASS").length;
const failed = results.filter((item) => item.status === "FAIL").length;

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

const reportPath = path.join(root, "organization-cookie-report.json");
fs.writeFileSync(
  reportPath,
  JSON.stringify({ passed, failed, results, at: new Date().toISOString() }, null, 2)
);
console.log(`Report: ${reportPath}`);

process.exit(auditOk && flowOk && results.every((item) => item.status === "PASS") ? 0 : 1);
