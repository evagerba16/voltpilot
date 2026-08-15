#!/usr/bin/env node

/**
 * Preflight checks for Sprint 2A authenticated E2E validation.
 * Run: npm run copilot:verify-sprint2a:preflight
 *
 * Verifies everything except real credential values (format + presence only).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

const email = process.env.BETA_TEST_EMAIL?.trim() ?? "";
const password = process.env.BETA_TEST_PASSWORD?.trim() ?? "";
const flag = process.env.NEXT_PUBLIC_ESTIMATE_COPILOT ?? "(unset)";
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const legacyOnly = process.argv.includes("--legacy-only");

const checks = [];

function ok(id, detail) {
  checks.push({ id, status: "pass", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function bad(id, detail) {
  checks.push({ id, status: "fail", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

function isPlaceholderCredentials() {
  return (
    !email ||
    !password ||
    /your[-_]?beta|your-test|your-password|placeholder/i.test(email) ||
    /your[-_]?beta|your-test|your-password|placeholder/i.test(password) ||
    !email.includes("@")
  );
}

async function main() {
  console.log("Sprint 2A validation preflight\n");

  // Playwright import
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    ok("playwright.chromium", "Browser launches successfully");
  } catch (error) {
    bad(
      "playwright.chromium",
      error instanceof Error ? error.message : "Run: npx playwright install chromium"
    );
  }

  // Validation script exists
  const scriptPath = path.join(root, "scripts/verify-copilot-sprint2a.mjs");
  if (fs.existsSync(scriptPath)) {
    ok("script.verify-sprint2a", "Playwright suite present");
  } else {
    bad("script.verify-sprint2a", "Missing scripts/verify-copilot-sprint2a.mjs");
  }

  // Screenshot dir writable
  const screenshotDir = path.join(root, "docs/validation/sprint-2a");
  fs.mkdirSync(path.join(screenshotDir, "artifacts"), { recursive: true });
  ok("dirs.validation", "docs/validation/sprint-2a/artifacts ready");

  // Credentials
  if (isPlaceholderCredentials()) {
    bad(
      "auth.credentials",
      "Set real BETA_TEST_EMAIL and BETA_TEST_PASSWORD in .env.local (only remaining blocker)"
    );
  } else {
    ok("auth.credentials", "BETA_TEST_* credentials look valid (format check only)");
  }

  // Feature flag expectation
  const expectedFlag = legacyOnly ? "0" : "1";
  if (flag === expectedFlag) {
    ok("env.copilot-flag", `NEXT_PUBLIC_ESTIMATE_COPILOT=${flag} matches ${legacyOnly ? "legacy" : "copilot"} pass`);
  } else {
    bad(
      "env.copilot-flag",
      `Expected NEXT_PUBLIC_ESTIMATE_COPILOT=${expectedFlag}, got ${flag} — restart dev server after updating .env.local`
    );
  }

  // Dev server
  try {
    const response = await fetch(`${baseUrl}/login`);
    if (response.status >= 500) {
      bad("infra.server", `GET /login returned HTTP ${response.status}`);
    } else {
      ok("infra.server", `GET /login returned HTTP ${response.status} at ${baseUrl}`);
    }
  } catch {
    bad("infra.server", `Cannot reach ${baseUrl} — start: npm run dev`);
  }

  // Estimate access (only when credentials look real)
  if (!isPlaceholderCredentials() && dbUrl) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const { rows } = await client.query(
        `select count(*)::int as count
         from public.estimates e
         join public.team_members tm on tm.organization_id = e.organization_id
         where lower(tm.email) = lower($1) and tm.status = 'active'`,
        [email]
      );
      const count = rows[0]?.count ?? 0;
      if (count > 0) {
        ok("data.estimate-access", `${count} estimate(s) accessible to test account`);
      } else {
        bad("data.estimate-access", "No estimates found for BETA_TEST_EMAIL organization");
      }
    } catch (error) {
      bad(
        "data.estimate-access",
        `DB check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      await client.end().catch(() => null);
    }
  } else if (!dbUrl) {
    bad("data.estimate-access", "Set SUPABASE_DB_URL in .env.local for estimate preflight (optional fallback: UI list click)");
  } else {
    bad("data.estimate-access", "Skipped — placeholder credentials");
  }

  const failed = checks.filter((row) => row.status === "fail").length;
  const failedIds = new Set(checks.filter((row) => row.status === "fail").map((row) => row.id));
  const credentialBlocker =
    failedIds.has("auth.credentials") &&
    [...failedIds].every((id) =>
      ["auth.credentials", "data.estimate-access"].includes(id)
    );

  console.log(`\nPreflight: ${checks.length - failed}/${checks.length} passed`);

  if (credentialBlocker) {
    console.log("\nEnvironment prepared. Only remaining step: supply valid BETA_TEST credentials.");
    console.log("Then run:");
    console.log("  npm run dev");
    console.log("  npm run copilot:verify-sprint2a:preflight");
    console.log("  COPILOT_E2E_BASE_URL=http://localhost:3000 npm run copilot:verify-sprint2a");
    process.exit(0);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
