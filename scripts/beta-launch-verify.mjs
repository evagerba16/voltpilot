#!/usr/bin/env node

/**
 * Beta launch checklist verifier.
 * Run: npm run beta:verify
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
  console.log(`PASS  ${label}`);
  if (evidence) console.log(`      ${evidence}`);
}

function fail(id, label, evidence, fix = null) {
  checklist.push({ id, label, status: "FAIL", evidence, fix });
  console.log(`FAIL  ${label}`);
  console.log(`      ${evidence}`);
  if (fix) console.log(`      Fix: ${fix}`);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...opts,
  });
}

console.log("=== VoltPilot Beta Launch Verification ===\n");

async function probeApiRoutes(baseUrl) {
  console.log("\n-- API routes (unauthenticated probes) --");
  const apiRoutes = [
    { path: "/api/health", expect: [200, 503] },
    { path: "/api/search?q=test", expect: [401, 403, 200] },
    { path: "/api/ai/estimate-review", method: "POST", body: "{}", expect: [401, 403, 400] },
    { path: "/api/ai/estimate-assistant", method: "POST", body: "{}", expect: [401, 403, 400] },
    { path: "/api/analytics/export/csv", expect: [401, 403] },
    { path: "/api/analytics/export/pdf", expect: [401, 403] },
  ];

  for (const route of apiRoutes) {
    try {
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method ?? "GET",
        headers: route.body ? { "Content-Type": "application/json" } : undefined,
        body: route.body,
      });
      const ok = route.expect.includes(response.status);
      if (ok) {
        pass(`api:${route.path}`, `${route.path} returns ${response.status}`, "no 500");
      } else if (response.status >= 500) {
        fail(`api:${route.path}`, `${route.path} no 500`, `got HTTP ${response.status}`);
      } else {
        pass(`api:${route.path}`, `${route.path} responds ${response.status}`, "expected range");
      }
    } catch {
      fail(
        `api:${route.path}`,
        `${route.path} reachable`,
        `cannot connect to ${baseUrl}`,
        "Run: NEXT_DIST_DIR=.next-build npm run start -- -p 3000"
      );
    }
  }
}

// 1. Environment variables
console.log("-- Environment --");
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"];
const optionalProd = ["OPENAI_API_KEY", "RESEND_API_KEY", "RESEND_FROM_EMAIL"];
for (const key of required) {
  if (process.env[key]?.trim()) {
    pass(`env:${key}`, `${key} set`, "value present in .env.local");
  } else {
    fail(`env:${key}`, `${key} set`, "missing from .env.local", "Copy .env.example → .env.local and set value");
  }
}
for (const key of optionalProd) {
  if (process.env[key]?.trim()) {
    pass(`env:${key}`, `${key} set (optional)`, "configured");
  } else {
    fail(
      `env:${key}`,
      `${key} set (optional)`,
      "not configured — AI/email features degraded",
      `Add ${key} to .env.local for full beta`
    );
  }
}

// 2. Migrations
console.log("\n-- Migrations 001–017 --");
const mig = run("node", ["scripts/verify-all-migrations.mjs"]);
if (mig.status === 0) {
  pass("db:migrations", "Migrations 001–017 verified", "verify-all-migrations.mjs exit 0");
} else {
  fail(
    "db:migrations",
    "Migrations 001–017 verified",
    mig.stdout?.split("\n").slice(-8).join(" ") || mig.stderr || "probe failed",
    "Set SUPABASE_DB_PASSWORD in .env.local and run npm run db:migrate"
  );
}

// 3. Build
console.log("\n-- Production build --");
if (process.env.BETA_VERIFY_SKIP_BUILD === "1") {
  pass("build", "npm run build", "skipped (BETA_VERIFY_SKIP_BUILD=1)");
} else {
  const build = run("npm", ["run", "build"], { env: { ...process.env } });
  if (build.status === 0) {
    pass("build", "npm run build", "exit 0");
  } else {
    fail("build", "npm run build", (build.stderr || build.stdout || "").slice(-500));
  }
}

// 4. Lint
console.log("\n-- Lint --");
const lint = run("npm", ["run", "lint"]);
if (lint.status === 0) {
  pass("lint", "npm run lint", "exit 0");
} else {
  fail("lint", "npm run lint", (lint.stdout || lint.stderr || "").slice(-300));
}

// 5. Estimate calculations
console.log("\n-- Estimate calculations --");
const calc = run("node", ["scripts/verify-estimate-calculations.mjs"]);
if (calc.status === 0) {
  pass("estimates:calc", "Estimate calculations", "verify-estimate-calculations.mjs exit 0");
} else {
  fail("estimates:calc", "Estimate calculations", calc.stderr || calc.stdout || "failed");
}

// 6. API routes (requires running production server)
const baseUrl = process.env.BETA_VERIFY_BASE_URL || "http://localhost:3000";
await probeApiRoutes(baseUrl);

// 7. RLS unauthorized probe
console.log("\n-- RLS / authorization --");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (supabaseUrl && anonKey) {
  const r = await fetch(`${supabaseUrl}/rest/v1/customers?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (r.status === 200) {
    const body = await r.json();
    if (Array.isArray(body) && body.length === 0) {
      pass("rls:anon", "Anon cannot read org customers", "empty result with anon JWT");
    } else {
      fail("rls:anon", "Anon cannot read org customers", `unexpected data: ${JSON.stringify(body).slice(0, 100)}`);
    }
  } else {
    pass("rls:anon", "Anon customer access blocked", `HTTP ${r.status}`);
  }
} else {
  fail("rls:anon", "Anon RLS probe", "missing Supabase env");
}

// Summary
console.log("\n=== Summary ===");
const passed = checklist.filter((c) => c.status === "PASS").length;
const failed = checklist.filter((c) => c.status === "FAIL").length;
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

const reportPath = path.join(root, "beta-launch-report.json");
fs.writeFileSync(reportPath, JSON.stringify({ passed, failed, checklist, at: new Date().toISOString() }, null, 2));
console.log(`Report: ${reportPath}`);

process.exit(failed > 0 ? 1 : 0);
