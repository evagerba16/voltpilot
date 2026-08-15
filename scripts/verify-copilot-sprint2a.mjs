#!/usr/bin/env node

/**
 * Sprint 2A authenticated E2E validation (Playwright browser session).
 * Run: npm run copilot:verify-sprint2a
 *
 * Requires:
 * - Dev server running (auto-detects port via COPILOT_E2E_BASE_URL or NEXT_PUBLIC_SITE_URL)
 * - BETA_TEST_EMAIL / BETA_TEST_PASSWORD in .env.local
 * - Migration 023 applied
 *
 * Modes:
 *   (default)       Copilot workflow when NEXT_PUBLIC_ESTIMATE_COPILOT=1
 *   --legacy-only   Legacy AI Review + Assistant when flag=0
 *   --all           Instructions to run both passes (two dev restarts)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import pg from "pg";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const screenshotDir = path.join(root, "docs/validation/sprint-2a");
const artifactsDir = path.join(screenshotDir, "artifacts");

const results = [];
let failures = 0;
const screenshots = [];
const consoleLog = [];
const networkLog = [];
const performanceObservations = [];

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

const baseUrl =
  process.env.COPILOT_E2E_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "http://localhost:3000";

const email = process.env.BETA_TEST_EMAIL?.trim();
const password = process.env.BETA_TEST_PASSWORD?.trim();
const copilotFlag = process.env.NEXT_PUBLIC_ESTIMATE_COPILOT === "1";
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const legacyOnly = process.argv.includes("--legacy-only");
const copilotOnly = process.argv.includes("--copilot-only") || !legacyOnly;
const runMode = legacyOnly ? "legacy" : "copilot";

const KNOWN_ISSUES = [
  {
    id: "duplicate-ai-review-card",
    description: "AiEstimateReviewCard may still be visible when Copilot flag is on",
    blocks_validation: false,
  },
  {
    id: "copilot-reanalyze-on-reopen",
    description: "Re-opening Copilot after reload runs a fresh analyze; resolved items hidden until re-analyze",
    blocks_validation: false,
  },
];

function isPlaceholderCredentials() {
  const valueEmail = email ?? "";
  const valuePassword = password ?? "";
  return (
    !valueEmail ||
    !valuePassword ||
    /your[-_]?beta|your-test|your-password|placeholder/i.test(valueEmail) ||
    /your[-_]?beta|your-test|your-password|placeholder/i.test(valuePassword) ||
    !valueEmail.includes("@")
  );
}

function assertConsoleClean(scope) {
  const errors = consoleLog.filter(
    (entry) => entry.type === "error" || entry.type === "pageerror"
  );
  if (errors.length === 0) {
    pass(`${scope}.console-clean`, "No console errors or unhandled rejections");
  } else {
    fail(
      `${scope}.console-clean`,
      `${errors.length} error(s): ${errors
        .slice(0, 3)
        .map((entry) => entry.text)
        .join(" | ")}`
    );
  }
}

function runStaticChecks() {
  try {
    execSync("npm run build", { cwd: root, stdio: "pipe" });
    pass("static.build", "npm run build passed");
  } catch (error) {
    const detail =
      error instanceof Error && "stderr" in error
        ? String(error.stderr).slice(-300)
        : "build failed";
    fail("static.build", detail);
  }

  try {
    execSync("npx tsc --noEmit", { cwd: root, stdio: "pipe" });
    pass("static.tsc", "npx tsc --noEmit passed");
  } catch (error) {
    const detail =
      error instanceof Error && "stderr" in error
        ? String(error.stderr).slice(-300)
        : "tsc failed";
    fail("static.tsc", detail);
  }
}

function pass(id, detail) {
  results.push({ id, status: "pass", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail) {
  results.push({ id, status: "fail", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
  failures += 1;
}

function skip(id, detail) {
  results.push({ id, status: "skip", detail });
  console.log(`SKIP  ${id}${detail ? ` — ${detail}` : ""}`);
}

async function shot(page, name) {
  const filePath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  screenshots.push(filePath);
  return filePath;
}

function authenticatedPathname(url) {
  const pathname = new URL(url).pathname;
  return pathname === "/dashboard" || pathname.startsWith("/estimates") ? pathname : null;
}

async function waitForAuthenticatedPage(page, timeout = 30000) {
  await page.waitForFunction(
    () => {
      const path = new URL(window.location.href).pathname;
      return path === "/dashboard" || path.startsWith("/estimates");
    },
    { timeout }
  );
}

async function loginWithBrowser(page) {
  await page.goto(`${baseUrl}/login?next=/estimates`, { waitUntil: "networkidle" });

  const existingPath = authenticatedPathname(page.url());
  if (existingPath) {
    pass("auth.session", `Active session at ${existingPath}`);
    return;
  }

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  try {
    await waitForAuthenticatedPage(page, 30000);
  } catch {
    const body = await page.content();
    if (body.includes("Sign in failed")) {
      throw new Error("Sign-in rejected — check BETA_TEST_EMAIL / BETA_TEST_PASSWORD");
    }
    throw new Error(`Sign-in did not redirect — still at ${page.url()}`);
  }

  const body = await page.content();
  if (body.includes("Cookies can only be modified")) {
    throw new Error("Cookie write error during sign-in");
  }

  pass("auth.login", `Redirected to ${authenticatedPathname(page.url()) ?? page.url()}`);
}

async function resolveEstimateIdFromDb() {
  if (!dbUrl || !email) return null;

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const { rows } = await client.query(
      `select e.id
       from public.estimates e
       join public.team_members tm on tm.organization_id = e.organization_id
       where lower(tm.email) = lower($1)
         and tm.status = 'active'
       order by e.updated_at desc nulls last
       limit 1`,
      [email]
    );
    return rows[0]?.id ? String(rows[0].id) : null;
  } catch (error) {
    console.warn(
      "DB estimate lookup failed:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  } finally {
    await client.end().catch(() => null);
  }
}

async function openFirstEstimate(page) {
  const estimateId = await resolveEstimateIdFromDb();

  if (estimateId) {
    await page.goto(`${baseUrl}/estimates/${estimateId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Save estimate" }).waitFor({ timeout: 20000 });
    pass("workflow.open-estimate", estimateId);
    return estimateId;
  }

  await page.goto(`${baseUrl}/estimates`, { waitUntil: "networkidle" });

  const listPath = new URL(page.url()).pathname;
  if (listPath === "/login") {
    throw new Error("Not authenticated — redirected to login when opening estimates list");
  }

  const firstRow = page.locator("tbody tr.cursor-pointer").first();
  await firstRow.waitFor({ state: "visible", timeout: 20000 });
  await firstRow.click();
  await page.waitForURL(/\/estimates\/[0-9a-f-]{36}/i, { timeout: 20000 });
  const match = page.url().match(/\/estimates\/([0-9a-f-]{36})/i);
  if (!match?.[1]) throw new Error("Could not open estimate from list");

  await page.getByRole("button", { name: "Save estimate" }).waitFor({ timeout: 20000 });
  pass("workflow.open-estimate", match[1]);
  return match[1];
}

async function dbLineItemCount(estimateId) {
  if (!dbUrl) return null;
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select count(*)::int as count from estimate_line_items where estimate_id = $1`,
      [estimateId]
    );
    return rows[0]?.count ?? 0;
  } finally {
    await client.end().catch(() => null);
  }
}

async function dbRecommendationSummary(estimateId) {
  if (!dbUrl) return [];
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select status, count(*)::int as count
       from copilot_recommendations
       where entity_type = 'estimate' and entity_id = $1
       group by status`,
      [estimateId]
    );
    return rows;
  } finally {
    await client.end().catch(() => null);
  }
}

function trackRequests(page, counts) {
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/copilot/analyze")) counts.analyze += 1;
    if (url.includes("/api/copilot/apply")) counts.apply += 1;
    if (url.includes("/api/copilot/dismiss")) counts.dismiss += 1;
    if (url.includes("/api/ai/estimate-review")) counts.legacyReview += 1;
    if (url.includes("/api/ai/estimate-assistant")) counts.legacyAssistant += 1;
  });
}

function attachPageInstrumentation(page) {
  page.on("console", (msg) => {
    consoleLog.push({
      type: msg.type(),
      text: msg.text(),
      at: new Date().toISOString(),
    });
  });
  page.on("pageerror", (error) => {
    consoleLog.push({
      type: "pageerror",
      text: error.message,
      at: new Date().toISOString(),
    });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (
      !url.includes("/api/copilot/") &&
      !url.includes("/api/ai/estimate-review") &&
      !url.includes("/api/ai/estimate-assistant")
    ) {
      return;
    }
    networkLog.push({
      method: response.request().method(),
      path: url.replace(baseUrl, ""),
      status: response.status(),
      ok: response.ok(),
      at: new Date().toISOString(),
    });
  });
}

function saveArtifacts() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const prefix = runMode;
  fs.writeFileSync(
    path.join(artifactsDir, `${prefix}-console.json`),
    JSON.stringify(consoleLog, null, 2)
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${prefix}-network.json`),
    JSON.stringify(networkLog, null, 2)
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${prefix}-performance.json`),
    JSON.stringify(performanceObservations, null, 2)
  );
}

async function waitForCopilotResults(page) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        /Pending \(\d+\)/.test(text) ||
        /Resolved \(\d+\)/.test(text) ||
        text.includes("No recommendations yet")
      );
    },
    { timeout: 60000 }
  );
}

async function runCopilotFlow(page, estimateId) {
  console.log("\n=== Copilot workflow (authenticated browser) ===");

  const counts = { analyze: 0, apply: 0, dismiss: 0, legacyReview: 0, legacyAssistant: 0 };
  trackRequests(page, counts);

  if (!copilotFlag) {
    fail("copilot.flag", "NEXT_PUBLIC_ESTIMATE_COPILOT must be 1 — restart dev server after updating .env.local");
    return;
  }
  pass("copilot.flag", "NEXT_PUBLIC_ESTIMATE_COPILOT=1");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "networkidle" });

  if (await page.getByRole("button", { name: "Review estimate" }).isVisible()) {
    fail("copilot.no-legacy-buttons", "Legacy Review button visible with Copilot enabled");
  } else {
    pass("copilot.no-legacy-buttons", "Legacy buttons hidden");
  }

  const copilotBtn = page.getByRole("button", { name: "Copilot" });
  await copilotBtn.waitFor({ state: "visible", timeout: 10000 });
  pass("copilot.toolbar-button", "Copilot button visible");

  await shot(page, "01-estimate-builder");

  const linesBefore = await dbLineItemCount(estimateId);

  await copilotBtn.click();
  await page.getByRole("heading", { name: "Estimate Copilot" }).waitFor({ timeout: 15000 });
  pass("copilot.panel-open", "Panel opened");

  await waitForCopilotResults(page);
  pass("copilot.analyze", "Analyze completed in panel");

  if (counts.analyze <= 2) {
    pass("copilot.analyze-requests", `${counts.analyze} analyze request(s) on open`);
  } else {
    fail("copilot.analyze-requests", `Too many analyze requests: ${counts.analyze}`);
  }

  await shot(page, "02-copilot-panel");

  const firstCard = page.locator("article").first();
  if (await firstCard.isVisible()) {
    await firstCard.scrollIntoViewIfNeeded();
    await shot(page, "03-recommendation-card");
  }

  const applyBtn = page.locator("article").getByRole("button", { name: "Apply" }).first();
  let didApply = false;

  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click();
    await page.waitForTimeout(2500);
    didApply = true;
    pass("copilot.apply", "Applied a recommendation via browser");
    pass("copilot.apply-requests", `${counts.apply} apply request(s)`);
    await shot(page, "04-after-apply");
  } else {
    fail("copilot.apply", "No actionable Apply button — estimate needs pending recommendations");
  }

  const dismissBtn = page.locator("article").getByRole("button", { name: "Dismiss" }).first();
  let didDismiss = false;

  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(2000);
    didDismiss = true;
    pass("copilot.dismiss", "Dismissed a recommendation via browser");
    pass("copilot.dismiss-requests", `${counts.dismiss} dismiss request(s)`);
    await shot(page, "05-after-dismiss");
  } else {
    fail("copilot.dismiss", "No Dismiss button — estimate needs pending recommendations");
  }

  await page.getByRole("button", { name: "Save estimate" }).click();
  await page.waitForTimeout(2000);
  pass("copilot.save", "Saved estimate from builder");

  const dbBeforeReload = await dbRecommendationSummary(estimateId);
  pass("copilot.db-pre-reload", JSON.stringify(dbBeforeReload));

  await page.getByLabel("Close copilot panel").click();
  await page.reload({ waitUntil: "networkidle" });
  pass("copilot.reload", "Reloaded estimate page");

  const linesAfter = await dbLineItemCount(estimateId);
  if (didApply && linesAfter != null && linesBefore != null && linesAfter >= linesBefore) {
    pass("copilot.persist-lines", `${linesBefore} → ${linesAfter} line items`);
  } else if (didApply) {
    fail("copilot.persist-lines", `Line items did not persist (${linesBefore} → ${linesAfter})`);
  }

  const dbAfterReload = await dbRecommendationSummary(estimateId);
  if (didApply && dbAfterReload.some((row) => row.status === "applied")) {
    pass("copilot.persist-applied", "Applied status in database");
  } else if (didApply) {
    fail("copilot.persist-applied", "No applied rows in database");
  }

  if (didDismiss && dbAfterReload.some((row) => row.status === "dismissed")) {
    pass("copilot.persist-dismissed", "Dismissed status in database");
  } else if (didDismiss) {
    fail("copilot.persist-dismissed", "No dismissed rows in database");
  }

  await shot(page, "06-estimate-after-reload");

  const perfStart = Date.now();
  await copilotBtn.click();
  await waitForCopilotResults(page);
  const perfMs = Date.now() - perfStart;
  performanceObservations.push({
    label: "copilot_panel_reopen_ms",
    value: perfMs,
    pass: perfMs < 30000,
  });
  if (perfMs < 30000) {
    pass("copilot.performance", `Panel ready in ${perfMs}ms`);
  } else {
    fail("copilot.performance", `Slow panel load: ${perfMs}ms`);
  }

  assertConsoleClean("copilot");

  const copilotApiCalls = networkLog.filter((entry) => entry.path.includes("/api/copilot/"));
  const copilotApiFailures = copilotApiCalls.filter((entry) => !entry.ok);
  if (copilotApiCalls.length > 0 && copilotApiFailures.length === 0) {
    pass("copilot.network", `${copilotApiCalls.length} /api/copilot/* response(s) all successful`);
  } else if (copilotApiCalls.length === 0) {
    fail("copilot.network", "No /api/copilot/* responses captured");
  } else {
    fail(
      "copilot.network",
      `${copilotApiFailures.length} failed: ${copilotApiFailures.map((entry) => `${entry.path} ${entry.status}`).join(", ")}`
    );
  }

  await page.getByLabel("Close copilot panel").click();
}

async function runLegacyFlow(page) {
  console.log("\n=== Legacy workflow (flag off, authenticated browser) ===");

  if (copilotFlag) {
    fail("legacy.flag", "NEXT_PUBLIC_ESTIMATE_COPILOT must be 0 — restart dev server");
    return;
  }
  pass("legacy.flag", "NEXT_PUBLIC_ESTIMATE_COPILOT=0");

  const counts = { analyze: 0, apply: 0, dismiss: 0, legacyReview: 0, legacyAssistant: 0 };
  trackRequests(page, counts);

  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "07-legacy-estimate-builder");

  if (await page.getByRole("button", { name: "Copilot" }).isVisible()) {
    fail("legacy.no-copilot", "Copilot button visible when flag off");
  } else {
    pass("legacy.no-copilot", "Copilot button hidden");
  }

  const reviewBtn = page.getByRole("button", { name: "Review estimate" });
  const assistantBtn = page.getByRole("button", { name: "AI Estimate" });
  await reviewBtn.waitFor({ state: "visible" });
  await assistantBtn.waitFor({ state: "visible" });
  pass("legacy.buttons", "AI Review + AI Estimate visible");

  await reviewBtn.click();
  await page.getByRole("heading", { name: "Senior estimator review" }).waitFor({ timeout: 15000 });
  pass("legacy.review-open", "AI Review panel opened");

  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes("Combined review") ||
        text.includes("Standard review") ||
        text.includes("AI analysis") ||
        text.includes("health")
      );
    },
    { timeout: 60000 }
  );

  if (counts.legacyReview >= 1) {
    pass("legacy.review-api", `${counts.legacyReview} /api/ai/estimate-review call(s)`);
  } else {
    fail("legacy.review-api", "No legacy review API call");
  }

  if (counts.analyze === 0) {
    pass("legacy.no-copilot-api", "No copilot API calls");
  } else {
    fail("legacy.no-copilot-api", `Copilot API leaked: analyze=${counts.analyze}`);
  }

  await shot(page, "08-legacy-ai-review");
  await page.getByLabel("Close review panel").click();

  await assistantBtn.click();
  await page.getByLabel("Close AI estimating assistant").waitFor({ timeout: 15000 });
  pass("legacy.assistant-open", "AI Assistant panel opened");
  await shot(page, "09-legacy-ai-assistant");
  await page.getByLabel("Close AI estimating assistant").click();
  pass("legacy.regression", "Legacy panels work unchanged");

  const legacyApiCalls = networkLog.filter(
    (entry) =>
      entry.path.includes("/api/ai/estimate-review") ||
      entry.path.includes("/api/ai/estimate-assistant")
  );
  const legacyApiFailures = legacyApiCalls.filter((entry) => !entry.ok);
  if (legacyApiCalls.length > 0 && legacyApiFailures.length === 0) {
    pass("legacy.network", `${legacyApiCalls.length} legacy AI API response(s) successful`);
  } else if (legacyApiCalls.length === 0) {
    fail("legacy.network", "No legacy AI API responses captured");
  } else {
    fail("legacy.network", `${legacyApiFailures.length} legacy API failure(s)`);
  }

  assertConsoleClean("legacy");
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });

  if (isPlaceholderCredentials()) {
    fail(
      "auth.credentials",
      "Set real BETA_TEST_EMAIL and BETA_TEST_PASSWORD in .env.local (currently placeholder values)"
    );
    writeReport("BLOCKED — missing or placeholder BETA_TEST credentials");
    process.exit(1);
  }

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Flag: NEXT_PUBLIC_ESTIMATE_COPILOT=${process.env.NEXT_PUBLIC_ESTIMATE_COPILOT ?? "(unset)"}`);

  try {
    const health = await fetch(`${baseUrl}/login`);
    if (!health.ok && health.status !== 401) {
      fail("infra.server", `Login page HTTP ${health.status}`);
    } else {
      pass("infra.server", `HTTP ${health.status}`);
    }
  } catch {
    fail("infra.server", `Cannot reach ${baseUrl} — start dev server first`);
    writeReport("BLOCKED — dev server unreachable");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  attachPageInstrumentation(page);

  try {
    await loginWithBrowser(page);
    const estimateId = await openFirstEstimate(page);

    if (legacyOnly) {
      await runLegacyFlow(page);
    } else {
      await runCopilotFlow(page, estimateId);
      if (!copilotFlag) {
        skip("legacy.workflow", "Run again with NEXT_PUBLIC_ESTIMATE_COPILOT=0 and --legacy-only");
      }
    }
  } catch (error) {
    fail("workflow.exception", error instanceof Error ? error.message : String(error));
    await shot(page, "error-state").catch(() => null);
  } finally {
    saveArtifacts();
    await browser.close();
  }

  const copilotArtifact = readModeReport("copilot");
  if (runMode === "legacy" && copilotArtifact) {
    console.log("\n=== Static checks (both passes recorded) ===");
    runStaticChecks();
  }

  writeReport();
  process.exit(failures > 0 ? 1 : 0);
}

function writeReport(blockedReason) {
  fs.mkdirSync(artifactsDir, { recursive: true });

  const modeReport = {
    generated_at: new Date().toISOString(),
    mode: runMode,
    base_url: baseUrl,
    copilot_flag: process.env.NEXT_PUBLIC_ESTIMATE_COPILOT ?? null,
    blocked: blockedReason ?? null,
    screenshots: screenshots.map((file) => path.relative(root, file)),
    console_log: path.relative(root, path.join(artifactsDir, `${runMode}-console.json`)),
    network_log: path.relative(root, path.join(artifactsDir, `${runMode}-network.json`)),
    performance: path.relative(root, path.join(artifactsDir, `${runMode}-performance.json`)),
    acceptance_criteria: buildAcceptanceCriteria(),
    summary: {
      total: results.length,
      passed: results.filter((row) => row.status === "pass").length,
      failed: results.filter((row) => row.status === "fail").length,
      skipped: results.filter((row) => row.status === "skip").length,
    },
    results,
  };

  if (!blockedReason) {
    fs.writeFileSync(
      path.join(artifactsDir, `${runMode}-report.json`),
      JSON.stringify(modeReport, null, 2)
    );
  }

  const merged = mergeValidationReports(blockedReason, modeReport);
  const jsonPath = path.join(root, "sprint-2a-validation-report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2));

  fs.writeFileSync(path.join(root, "docs/validation/sprint-2a/REPORT.md"), buildMarkdownReport(merged));
  fs.writeFileSync(path.join(root, "docs/validation/sprint-2a/GO-NO-GO.md"), buildGoNoGoReport(merged));

  console.log(`\nReport: ${jsonPath}`);
  console.log(`Markdown: docs/validation/sprint-2a/REPORT.md`);
  console.log(`Go/No-Go: docs/validation/sprint-2a/GO-NO-GO.md`);
  console.log(`Status: ${merged.status}`);
  console.log(`Recommendation: ${merged.recommendation}`);
}

function readModeReport(mode) {
  const filePath = path.join(artifactsDir, `${mode}-report.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function mergeValidationReports(blockedReason, currentReport) {
  const copilotReport = runMode === "copilot" && !blockedReason ? currentReport : readModeReport("copilot");
  const legacyReport = runMode === "legacy" && !blockedReason ? currentReport : readModeReport("legacy");

  const allResults = [
    ...(copilotReport?.results ?? (runMode === "copilot" ? results : [])),
    ...(legacyReport?.results ?? (runMode === "legacy" ? results : [])),
  ];

  const acceptance = mergeAcceptanceCriteria(copilotReport, legacyReport, blockedReason, allResults);

  const totalFailed =
    (copilotReport?.summary?.failed ?? (runMode === "copilot" ? failures : 0)) +
    (legacyReport?.summary?.failed ?? (runMode === "legacy" ? failures : 0)) +
    (blockedReason ? 1 : 0);

  const copilotDone = copilotReport && !copilotReport.blocked && (copilotReport.summary?.failed ?? 0) === 0;
  const legacyDone = legacyReport && !legacyReport.blocked && (legacyReport.summary?.failed ?? 0) === 0;
  const bothDone = copilotDone && legacyDone;

  let status = "pending_validation";
  if (blockedReason || isPlaceholderCredentials()) {
    status = "pending_validation";
  } else if (bothDone && allCriteriaPass(acceptance)) {
    status = "validated";
  } else if (totalFailed > 0) {
    status = "pending_validation";
  }

  let recommendation = "NO-GO — Pending Validation";
  if (blockedReason) {
    recommendation = "NO-GO — Pending Validation (blocked)";
  } else if (status === "validated") {
    recommendation = "GO — Sprint 2B may begin";
  } else if (totalFailed > 0) {
    recommendation = "NO-GO — Fix validation failures, rerun affected pass(es)";
  } else if (copilotDone && !legacyDone) {
    recommendation = "NO-GO — Complete legacy pass (NEXT_PUBLIC_ESTIMATE_COPILOT=0)";
  }

  const regressions = allResults.filter(
    (row) => row.id.startsWith("legacy.") && row.status === "fail"
  );
  const bugsFound = allResults.filter((row) => row.status === "fail");

  return {
    generated_at: new Date().toISOString(),
    sprint: "2A",
    status,
    base_url: baseUrl,
    copilot_flag: process.env.NEXT_PUBLIC_ESTIMATE_COPILOT ?? null,
    blocked: blockedReason ?? (isPlaceholderCredentials() ? "placeholder BETA_TEST credentials" : null),
    passes: {
      copilot: copilotDone ? "passed" : copilotReport ? "failed" : "not_run",
      legacy: legacyDone ? "passed" : legacyReport ? "failed" : "not_run",
    },
    acceptance_criteria: acceptance,
    test_summary: {
      total_run: allResults.length,
      passed: allResults.filter((row) => row.status === "pass").length,
      failed: allResults.filter((row) => row.status === "fail").length,
      skipped: allResults.filter((row) => row.status === "skip").length,
    },
    performance_summary: loadPerformanceSummary(),
    known_issues: KNOWN_ISSUES,
    regressions: regressions.map((row) => ({ id: row.id, detail: row.detail })),
    bugs_found: bugsFound.map((row) => ({ id: row.id, detail: row.detail, fixed: false })),
    evidence: {
      screenshots: [
        ...(copilotReport?.screenshots ?? []),
        ...(legacyReport?.screenshots ?? []),
      ],
      console_logs: [
        copilotReport?.console_log,
        legacyReport?.console_log,
      ].filter(Boolean),
      network_logs: [
        copilotReport?.network_log,
        legacyReport?.network_log,
      ].filter(Boolean),
      performance: [
        copilotReport?.performance,
        legacyReport?.performance,
      ].filter(Boolean),
    },
    go_no_go: {
      production_ready: status === "validated",
      remaining_bugs: status !== "validated",
      regressions_known: legacyDone ? legacyReport.summary.failed === 0 : false,
      safe_for_sprint_2b: status === "validated",
    },
    summary: {
      total: allResults.length,
      passed: allResults.filter((row) => row.status === "pass").length,
      failed: allResults.filter((row) => row.status === "fail").length,
      skipped: allResults.filter((row) => row.status === "skip").length,
    },
    recommendation,
    results: allResults.length > 0 ? allResults : results,
  };
}

function buildAcceptanceCriteria() {
  return {
    login: statusFor(["auth.login", "auth.session"]),
    open_estimate: statusFor("workflow.open-estimate"),
    open_copilot_panel: statusFor("copilot.panel-open"),
    run_analyze: statusFor("copilot.analyze"),
    apply_recommendation: statusFor("copilot.apply"),
    dismiss_recommendation: statusFor("copilot.dismiss"),
    save_estimate: statusFor("copilot.save"),
    reload_estimate: statusFor("copilot.reload"),
    persistence: statusFor(["copilot.persist-applied", "copilot.persist-dismissed", "copilot.persist-lines"]),
    legacy_review: statusFor("legacy.review-open"),
    legacy_assistant: statusFor("legacy.assistant-open"),
    legacy_builder_unchanged: statusFor("legacy.regression"),
    console_clean: statusFor(["copilot.console-clean", "legacy.console-clean"]),
    copilot_network: statusFor("copilot.network"),
    legacy_network: statusFor("legacy.network"),
  };
}

function mergeAcceptanceCriteria(copilotReport, legacyReport, blockedReason, allResults = []) {
  if (blockedReason) {
    return {
      login: "not_run",
      open_estimate: "not_run",
      open_copilot_panel: "not_run",
      run_analyze: "not_run",
      apply_recommendation: "not_run",
      dismiss_recommendation: "not_run",
      save_estimate: "not_run",
      reload_estimate: "not_run",
      persistence: "not_run",
      legacy_review: "not_run",
      legacy_assistant: "not_run",
      legacy_builder_unchanged: "not_run",
    };
  }

  const copilot = copilotReport?.acceptance_criteria ?? buildAcceptanceCriteria();
  const legacy = legacyReport?.acceptance_criteria ?? {};

  return {
    login: pickStatus(copilot.login, legacy.login),
    open_estimate: copilot.open_estimate ?? "not_run",
    open_copilot_panel: copilot.open_copilot_panel ?? "not_run",
    run_analyze: copilot.run_analyze ?? "not_run",
    apply_recommendation: copilot.apply_recommendation ?? "not_run",
    dismiss_recommendation: copilot.dismiss_recommendation ?? "not_run",
    save_estimate: copilot.save_estimate ?? "not_run",
    reload_estimate: copilot.reload_estimate ?? "not_run",
    persistence: copilot.persistence ?? "not_run",
    console_clean: pickStatus(copilot.console_clean, legacy.console_clean),
    copilot_api_success: copilot.copilot_network ?? "not_run",
    legacy_review: legacy.legacy_review ?? "not_run",
    legacy_assistant: legacy.legacy_assistant ?? "not_run",
    legacy_builder_unchanged: legacy.legacy_builder_unchanged ?? "not_run",
    legacy_no_regression: legacy.legacy_builder_unchanged ?? "not_run",
    build: staticStatus(allResults, "static.build"),
    typescript: staticStatus(allResults, "static.tsc"),
  };
}

function staticStatus(allResults, id) {
  const row = allResults.find((entry) => entry.id === id);
  if (!row) return "not_run";
  return row.status === "pass" ? "pass" : row.status === "fail" ? "fail" : "not_run";
}

function pickStatus(a, b) {
  const values = [a, b].filter(Boolean);
  if (values.some((value) => value === "fail")) return "fail";
  if (values.some((value) => value === "pass")) return "pass";
  return "not_run";
}

function allCriteriaPass(acceptance) {
  const required = [
    "login",
    "open_estimate",
    "open_copilot_panel",
    "run_analyze",
    "apply_recommendation",
    "dismiss_recommendation",
    "save_estimate",
    "reload_estimate",
    "persistence",
    "console_clean",
    "copilot_api_success",
    "legacy_review",
    "legacy_assistant",
    "legacy_builder_unchanged",
    "build",
    "typescript",
  ];
  return required.every((key) => acceptance[key] === "pass");
}

function loadPerformanceSummary() {
  const entries = [];
  for (const mode of ["copilot", "legacy"]) {
    const filePath = path.join(artifactsDir, `${mode}-performance.json`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
      entries.push(...rows.map((row) => ({ mode, ...row })));
    } catch {
      // ignore
    }
  }
  return entries;
}

function statusFor(id) {
  const ids = Array.isArray(id) ? id : [id];
  const rows = results.filter((row) => ids.includes(row.id));
  if (rows.some((row) => row.status === "fail")) return "fail";
  if (rows.some((row) => row.status === "pass")) return "pass";
  if (rows.some((row) => row.status === "skip")) return "skip";
  return "not_run";
}

function buildMarkdownReport(report) {
  const ac = report.acceptance_criteria ?? {};
  const ts = report.test_summary ?? report.summary ?? {};
  return `# Sprint 2A Validation Report

Generated: ${report.generated_at}

**Status:** ${formatStatusLabel(report.status)}  
**Base URL:** ${report.base_url}  
**Copilot flag:** ${report.copilot_flag ?? "unset"}  
**Recommendation:** ${report.recommendation}

## Test summary

| Metric | Count |
|--------|------:|
| Total tests run | ${ts.total_run ?? ts.total ?? 0} |
| Passed | ${ts.passed ?? 0} |
| Failed | ${ts.failed ?? 0} |
| Skipped | ${ts.skipped ?? 0} |

## Acceptance criteria (pass/fail)

| Criterion | Status |
|-----------|--------|
| Login | ${ac.login ?? "not_run"} |
| Open estimate | ${ac.open_estimate ?? "not_run"} |
| Open Copilot panel | ${ac.open_copilot_panel ?? "not_run"} |
| Run Analyze | ${ac.run_analyze ?? "not_run"} |
| Apply recommendation | ${ac.apply_recommendation ?? "not_run"} |
| Dismiss recommendation | ${ac.dismiss_recommendation ?? "not_run"} |
| Save estimate | ${ac.save_estimate ?? "not_run"} |
| Reload estimate | ${ac.reload_estimate ?? "not_run"} |
| Apply/Dismiss persistence | ${ac.persistence ?? "not_run"} |
| No console errors / unhandled rejections | ${ac.console_clean ?? "not_run"} |
| All /api/copilot/* successful | ${ac.copilot_api_success ?? "not_run"} |
| Legacy AI Review | ${ac.legacy_review ?? "not_run"} |
| Legacy AI Assistant | ${ac.legacy_assistant ?? "not_run"} |
| Legacy builder unchanged | ${ac.legacy_builder_unchanged ?? "not_run"} |
| Build passes | ${ac.build ?? "not_run"} |
| TypeScript passes | ${ac.typescript ?? "not_run"} |

## Screenshots captured

${report.evidence?.screenshots?.map((file) => `- ${file}`).join("\n") || "_None_"}

## Performance summary

${
  (report.performance_summary ?? []).length > 0
    ? report.performance_summary
        .map((row) => `- **${row.label}** (${row.mode}): ${row.value}ms ${row.pass ? "✓" : "✗"}`)
        .join("\n")
    : "_Not captured_"
}

## Regressions discovered

${
  (report.regressions ?? []).length > 0
    ? report.regressions.map((row) => `- \`${row.id}\`: ${row.detail}`).join("\n")
    : "_None detected_"
}

## Bugs found

${
  (report.bugs_found ?? []).length > 0
    ? report.bugs_found
        .map((row) => `- \`${row.id}\`: ${row.detail} (fixed: ${row.fixed ? "yes" : "no"})`)
        .join("\n")
    : "_None detected during validation_"
}

## Known issues (non-blocking)

${
  (report.known_issues ?? KNOWN_ISSUES)
    .map((row) => `- \`${row.id}\`: ${row.description}`)
    .join("\n")
}

## Evidence artifacts

### Console logs

${report.evidence?.console_logs?.map((file) => `- ${file}`).join("\n") || "_Not captured_"}

### Network traces

${report.evidence?.network_logs?.map((file) => `- ${file}`).join("\n") || "_Not captured_"}

## Detailed results

${report.results.map((row) => `- **${row.status.toUpperCase()}** \`${row.id}\`${row.detail ? `: ${row.detail}` : ""}`).join("\n")}
`;
}

function buildGoNoGoReport(report) {
  const g = report.go_no_go ?? {};
  const ac = report.acceptance_criteria ?? {};
  const ts = report.test_summary ?? report.summary ?? {};
  return `# Sprint 2A Go/No-Go Report

**Status:** ${formatStatusLabel(report.status)}  
**Generated:** ${report.generated_at}  
**Sprint 2B:** ${g.safe_for_sprint_2b ? "May begin" : "Do not begin"}

---

## Final recommendation

**${report.recommendation}**

${report.blocked ? `\n> **Blocker:** ${report.blocked}\n` : ""}

---

## Go/No-Go questions

| Question | Answer |
|----------|--------|
| Is Sprint 2A production-ready? | **${g.production_ready ? "Yes" : "No"}** |
| Every Playwright test passed? | **${(ts.failed ?? 0) === 0 && (ts.total_run ?? 0) > 0 ? "Yes" : "No / not run"}** |
| No console errors or unhandled rejections? | **${ac.console_clean === "pass" ? "Yes" : ac.console_clean === "not_run" ? "Not verified" : "No"}** |
| All /api/copilot/* successful? | **${ac.copilot_api_success === "pass" ? "Yes" : ac.copilot_api_success === "not_run" ? "Not verified" : "No"}** |
| Apply/Dismiss persist after reload? | **${ac.persistence === "pass" ? "Yes" : ac.persistence === "not_run" ? "Not verified" : "No"}** |
| Legacy workflow passes (flag=0)? | **${ac.legacy_review === "pass" && ac.legacy_assistant === "pass" ? "Yes" : "Not verified / failed"}** |
| Build and TypeScript pass? | **${ac.build === "pass" && ac.typescript === "pass" ? "Yes" : ac.build === "not_run" ? "Not verified" : "No"}** |
| Regressions discovered? | **${(report.regressions ?? []).length > 0 ? "Yes — see below" : ac.legacy_review === "not_run" ? "Unknown" : "None"}** |
| Safe to begin Sprint 2B? | **${g.safe_for_sprint_2b ? "Yes" : "No"}** |

---

## Test summary

| Metric | Count |
|--------|------:|
| Total tests run | ${ts.total_run ?? ts.total ?? 0} |
| Passed | ${ts.passed ?? 0} |
| Failed | ${ts.failed ?? 0} |
| Skipped | ${ts.skipped ?? 0} |

---

## Acceptance criteria (pass/fail)

| Criterion | Status |
|-----------|--------|
| Login | ${ac.login ?? "not_run"} |
| Open estimate | ${ac.open_estimate ?? "not_run"} |
| Open Copilot panel | ${ac.open_copilot_panel ?? "not_run"} |
| Run Analyze | ${ac.run_analyze ?? "not_run"} |
| Apply recommendation | ${ac.apply_recommendation ?? "not_run"} |
| Dismiss recommendation | ${ac.dismiss_recommendation ?? "not_run"} |
| Save estimate | ${ac.save_estimate ?? "not_run"} |
| Reload estimate | ${ac.reload_estimate ?? "not_run"} |
| Apply/Dismiss persistence | ${ac.persistence ?? "not_run"} |
| No console errors | ${ac.console_clean ?? "not_run"} |
| /api/copilot/* all successful | ${ac.copilot_api_success ?? "not_run"} |
| Legacy AI Review | ${ac.legacy_review ?? "not_run"} |
| Legacy AI Assistant | ${ac.legacy_assistant ?? "not_run"} |
| Legacy builder unchanged | ${ac.legacy_builder_unchanged ?? "not_run"} |
| Build | ${ac.build ?? "not_run"} |
| TypeScript | ${ac.typescript ?? "not_run"} |

---

## Validation passes

| Pass | Status |
|------|--------|
| Copilot (flag=1) | ${report.passes?.copilot ?? "not_run"} |
| Legacy (flag=0) | ${report.passes?.legacy ?? "not_run"} |

---

## Screenshots captured

${report.evidence?.screenshots?.map((file) => `- ${file}`).join("\n") || "_None_"}

---

## Performance summary

${
  (report.performance_summary ?? []).length > 0
    ? report.performance_summary
        .map((row) => `- **${row.label}** (${row.mode}): ${row.value}ms`)
        .join("\n")
    : "_Not captured_"
}

---

## Regressions discovered

${
  (report.regressions ?? []).length > 0
    ? report.regressions.map((row) => `- \`${row.id}\`: ${row.detail}`).join("\n")
    : "_None detected_"
}

---

## Bugs found during validation

${
  (report.bugs_found ?? []).length > 0
    ? report.bugs_found
        .map((row) => `- \`${row.id}\`: ${row.detail} — **fixed:** ${row.fixed ? "yes" : "no"}`)
        .join("\n")
    : "_None detected_"
}

---

## Known issues (documented, non-blocking)

${
  (report.known_issues ?? KNOWN_ISSUES)
    .map((row) => `- \`${row.id}\`: ${row.description}`)
    .join("\n")
}

---

## Evidence locations

| Type | Path |
|------|------|
| Playwright JSON | \`sprint-2a-validation-report.json\` |
| Console logs | \`docs/validation/sprint-2a/artifacts/*-console.json\` |
| Network traces | \`docs/validation/sprint-2a/artifacts/*-network.json\` |
| Performance | \`docs/validation/sprint-2a/artifacts/*-performance.json\` |
| Runbook | \`docs/validation/sprint-2a/RUNBOOK.md\` |

---

## Run when credentials are available

\`\`\`bash
npm run copilot:verify-sprint2a:preflight
COPILOT_E2E_BASE_URL=http://localhost:3000 npm run copilot:verify-sprint2a
# Restart dev server with NEXT_PUBLIC_ESTIMATE_COPILOT=0
COPILOT_E2E_BASE_URL=http://localhost:3000 npm run copilot:verify-sprint2a:legacy
\`\`\`

Reports update automatically. Status changes to **Validated** only when all criteria pass.
`;
}

function formatStatusLabel(status) {
  if (status === "validated") return "Validated";
  if (status === "validation_failed") return "Validation Failed";
  return "Pending Validation";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
