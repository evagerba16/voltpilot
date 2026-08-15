#!/usr/bin/env node

/**
 * Production operations verification for closed beta launch.
 * Run: npm run prod:verify
 *
 * Optional env:
 *   PROD_VERIFY_BASE_URL — production URL (default from NEXT_PUBLIC_SITE_URL)
 *   BETA_VERIFY_SKIP_BUILD=1 — skip build step
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

const checklist = [];

function pass(id, label, evidence) {
  checklist.push({ id, label, status: "PASS", evidence });
  console.log(`✅  ${label}`);
  if (evidence) console.log(`    ${evidence}`);
}

function fail(id, label, evidence, fix = null) {
  checklist.push({ id, label, status: "FAIL", evidence, fix });
  console.log(`❌  ${label}`);
  console.log(`    ${evidence}`);
  if (fix) console.log(`    Fix: ${fix}`);
}

function warn(id, label, evidence) {
  checklist.push({ id, label, status: "WARN", evidence });
  console.log(`⚠️   ${label}`);
  if (evidence) console.log(`    ${evidence}`);
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
}

console.log("=== VoltPilot Production Operations Verification ===\n");

// --- 1. Environment ---
console.log("-- 1. Environment variables --");

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const production = [
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "RESEND_API_KEY",
];

for (const key of required) {
  if (process.env[key]?.trim()) {
    pass(`env:${key}`, `${key}`, "set");
  } else {
    fail(`env:${key}`, `${key}`, "missing", "Copy .env.example → .env.local");
  }
}

for (const key of production) {
  if (process.env[key]?.trim()) {
    pass(`env:${key}`, `${key} (production)`, "set");
  } else {
    fail(`env:${key}`, `${key} (production)`, "missing", `Set ${key} on Vercel`);
  }
}

const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
if (fromEmail && !fromEmail.includes("resend.dev")) {
  pass("env:resend-domain", "Resend from address uses verified domain", fromEmail);
} else if (process.env.RESEND_API_KEY?.trim()) {
  warn(
    "env:resend-domain",
    "Resend from address",
    'Using default sandbox — set RESEND_FROM_EMAIL to a verified domain before beta'
  );
} else {
  fail("env:resend-domain", "Resend from address", "RESEND_API_KEY not set");
}

const siteUrl = (
  process.env.PROD_VERIFY_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  ""
).replace(/\/$/, "");
if (siteUrl && !siteUrl.includes("localhost")) {
  pass("env:site-url", "Production site URL configured", siteUrl);
} else {
  fail(
    "env:site-url",
    "Production site URL configured",
    siteUrl || "not set",
    "Set NEXT_PUBLIC_SITE_URL on Vercel or PROD_VERIFY_BASE_URL for verification"
  );
}

if (fs.existsSync(path.join(root, ".env.example"))) {
  pass("env:example", ".env.example committed", "present");
} else {
  fail("env:example", ".env.example committed", "missing", "Add .env.example from template");
}

// --- 2. Build & lint ---
console.log("\n-- 2. Build & lint --");

if (process.env.BETA_VERIFY_SKIP_BUILD === "1") {
  pass("build", "npm run build", "skipped");
} else {
  const build = run("npm", ["run", "build"]);
  if (build.status === 0) {
    pass("build", "npm run build", "exit 0");
  } else {
    fail("build", "npm run build", (build.stderr || build.stdout || "").slice(-400));
  }
}

const lint = run("npm", ["run", "lint"]);
if (lint.status === 0) {
  pass("lint", "npm run lint", "exit 0");
} else {
  fail("lint", "npm run lint", (lint.stdout || lint.stderr || "").slice(-300));
}

// --- 3. Legal pages ---
console.log("\n-- 3. Legal pages --");

for (const route of ["/privacy", "/terms"]) {
  const file = path.join(root, "app", route.slice(1), "page.tsx");
  if (fs.existsSync(file)) {
    pass(`legal:${route}`, `${route} page exists`, file);
  } else {
    fail(`legal:${route}`, `${route} page exists`, "missing");
  }
}

// --- 4. Reliability artifacts ---
console.log("\n-- 4. Reliability --");

for (const file of [
  "app/global-error.tsx",
  "app/error.tsx",
  "lib/observability/logger.ts",
  "lib/observability/capture-exception.ts",
]) {
  if (fs.existsSync(path.join(root, file))) {
    pass(`reliability:${file}`, file, "present");
  } else {
    fail(`reliability:${file}`, file, "missing");
  }
}

if (process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
  pass("reliability:sentry", "Sentry DSN configured", "optional but recommended");
} else {
  warn("reliability:sentry", "Sentry DSN", "not set — add SENTRY_DSN before beta");
}

// --- 5. Remote probes ---
console.log("\n-- 5. Remote probes --");

const baseUrl = (process.env.PROD_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "")
  .replace(/\/$/, "");

if (!baseUrl) {
  fail("remote:base", "Production base URL", "PROD_VERIFY_BASE_URL or NEXT_PUBLIC_SITE_URL required");
} else {
  pass("remote:base", "Production base URL", baseUrl);

  async function probe(path, expectStatuses, label) {
    try {
      const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      if (expectStatuses.includes(response.status)) {
        pass(`remote:${path}`, label, `HTTP ${response.status}`);
      } else {
        fail(`remote:${path}`, label, `HTTP ${response.status} (expected ${expectStatuses.join("|")})`);
      }
    } catch (error) {
      fail(`remote:${path}`, label, error instanceof Error ? error.message : "fetch failed");
    }
  }

  await probe("/api/health", [200, 503], "Health endpoint responds");
  await probe("/subscribe", [200], "Subscribe page loads");
  await probe("/login", [200], "Login page loads");
  await probe("/privacy", [200], "Privacy page loads");
  await probe("/terms", [200], "Terms page loads");
  await probe("/auth/callback", [307, 302, 200], "Auth callback route exists");

  // Stripe webhook should reject unsigned POST with 400, not 500
  try {
    const webhook = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (webhook.status === 503) {
      fail(
        "remote:stripe-webhook",
        "Stripe webhook configured",
        "returns 503 — STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing on production"
      );
    } else if ([400, 401].includes(webhook.status)) {
      pass(
        "remote:stripe-webhook",
        "Stripe webhook endpoint reachable",
        `HTTP ${webhook.status} (signature validation active)`
      );
    } else {
      warn("remote:stripe-webhook", "Stripe webhook", `unexpected HTTP ${webhook.status}`);
    }
  } catch (error) {
    fail("remote:stripe-webhook", "Stripe webhook", error instanceof Error ? error.message : "failed");
  }

  // Health body check
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    const body = await health.json();
    if (body.status === "ok") {
      pass("remote:health-ok", "Production health status ok", JSON.stringify(body.checks));
    } else {
      fail(
        "remote:health-ok",
        "Production health status ok",
        `status=${body.status} checks=${JSON.stringify(body.checks)}`,
        "Fix missing production env vars on Vercel"
      );
    }
  } catch (error) {
    fail("remote:health-ok", "Production health JSON", error instanceof Error ? error.message : "failed");
  }
}

// --- Summary ---
console.log("\n=== Summary ===");
const passed = checklist.filter((c) => c.status === "PASS").length;
const failed = checklist.filter((c) => c.status === "FAIL").length;
const warnings = checklist.filter((c) => c.status === "WARN").length;

console.log(`Passed:   ${passed}`);
console.log(`Failed:   ${failed}`);
console.log(`Warnings: ${warnings}`);

const reportPath = path.join(root, "docs/validation/production-readiness/OPS_VERIFY.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify({ passed, failed, warnings, checklist, at: new Date().toISOString() }, null, 2)
);
console.log(`Report: ${reportPath}`);

const opsGreen = failed === 0;
console.log(opsGreen ? "\n🟢 Production Operations: GREEN" : "\n🔴 Production Operations: NOT GREEN");

process.exit(opsGreen ? 0 : 1);
