#!/usr/bin/env node
/**
 * UX-2 customer & project detail verification (static checks).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const checks = [];

function pass(id, detail) {
  checks.push({ id, status: "PASS", detail });
}

function fail(id, detail) {
  checks.push({ id, status: "FAIL", detail });
}

const customerDetail = read("components/customers/customer-detail.tsx");
const projectDetail = read("components/projects/project-detail.tsx");
const hero = read("components/dashboard/dashboard-hero.tsx");
const insights = read("lib/ai/insight-category.ts");
const primaryAction = read("lib/dashboard/primary-action.ts");

if (customerDetail.includes("EntityTabs")) pass("customer.tabs", "Tabbed layout wired");
else fail("customer.tabs", "Missing EntityTabs");

if (customerDetail.includes("CustomerAiInsightsCompact")) pass("customer.compact-ai", "Compact AI on customer");
else fail("customer.compact-ai", "Missing compact AI");

if (!customerDetail.includes("bg-gradient-to-br from-primary")) pass("customer.light-hero", "Gradient hero removed");
else fail("customer.light-hero", "Gradient hero still present");

if (customerDetail.includes("New project")) pass("customer.primary-cta", "Primary CTA present");
else fail("customer.primary-cta", "Primary CTA missing");

if (customerDetail.includes("EntityAttentionStrip")) pass("customer.attention-strip", "Attention strip wired");
else fail("customer.attention-strip", "Attention strip missing");

if (projectDetail.includes("EntityTabs")) pass("project.tabs", "Tabbed layout wired");
else fail("project.tabs", "Missing EntityTabs");

if (projectDetail.includes("ProjectAiInsightsCompact")) pass("project.compact-ai", "Compact AI on project");
else fail("project.compact-ai", "Missing compact AI");

if (!projectDetail.includes("from-slate-950")) pass("project.light-hero", "Dark gradient hero removed");
else fail("project.light-hero", "Dark gradient hero still present");

if (projectDetail.includes("ProjectKpiGrid") && projectDetail.includes("compact")) pass("project.kpi-limit", "Overview KPIs limited");
else fail("project.kpi-limit", "KPI limit missing");

if (hero.includes("primaryAction")) pass("dashboard.context-cta", "Context-aware dashboard CTA");
else fail("dashboard.context-cta", "Dashboard CTA not context-aware");

if (primaryAction.includes("resolveDashboardPrimaryAction")) pass("dashboard.primary-action-logic", "Primary action resolver exists");
else fail("dashboard.primary-action-logic", "Primary action resolver missing");

if (insights.includes("needs_attention") && insights.includes("informational")) pass("ai.insight-categories", "AI insight categories defined");
else fail("ai.insight-categories", "AI categories missing");

const tsc = spawnSync("npx", ["tsc", "--noEmit"], { cwd: root, encoding: "utf8" });
if (tsc.status === 0) pass("build.typescript", "tsc --noEmit");
else fail("build.typescript", (tsc.stderr || tsc.stdout || "tsc failed").slice(0, 500));

const outDir = path.join(root, "docs/validation/ux-2");
fs.mkdirSync(outDir, { recursive: true });

const qaResults = {
  generatedAt: new Date().toISOString(),
  phase: "UX-2",
  checks,
  summary: {
    pass: checks.filter((c) => c.status === "PASS").length,
    fail: checks.filter((c) => c.status === "FAIL").length,
    total: checks.length,
  },
};

fs.writeFileSync(path.join(outDir, "qa-results.json"), `${JSON.stringify(qaResults, null, 2)}\n`);

const failed = checks.filter((c) => c.status === "FAIL");
console.log(`UX-2 verify: ${qaResults.summary.pass}/${qaResults.summary.total} pass`);
for (const check of checks) {
  console.log(`  [${check.status}] ${check.id}${check.detail ? ` — ${check.detail}` : ""}`);
}

process.exit(failed.length > 0 ? 1 : 0);
