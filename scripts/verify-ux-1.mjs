#!/usr/bin/env node
/**
 * UX-1 dashboard wiring verification (static checks).
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

const dashboardHome = read("components/dashboard/dashboard-home.tsx");
const dashboardPage = read("app/(dashboard)/dashboard/page.tsx");
const teamTypes = read("lib/teams/types.ts");
const kpiGrid = read("components/dashboard/dashboard-kpi-grid.tsx");
const aiPage = read("app/(dashboard)/ai/page.tsx");
const hero = read("components/dashboard/dashboard-hero.tsx");

if (!dashboardHome.includes("DailyAiBriefing")) pass("dashboard.no-daily-briefing", "Removed from home");
else fail("dashboard.no-daily-briefing", "DailyAiBriefing still imported");

if (!dashboardHome.includes("AiCopilotPanel")) pass("dashboard.no-copilot", "Removed from home");
else fail("dashboard.no-copilot", "AiCopilotPanel still imported");

if (!dashboardHome.includes("AiInsightsPanel")) pass("dashboard.no-full-ai-panel", "Full panel removed");
else fail("dashboard.no-full-ai-panel", "AiInsightsPanel still imported");

if (!dashboardHome.includes("DashboardQuickActions")) pass("dashboard.no-quick-actions", "Quick actions removed");
else fail("dashboard.no-quick-actions", "Quick actions still present");

if (dashboardHome.includes("DashboardAiInsightsCompact")) pass("dashboard.compact-ai", "Compact AI insights wired");
else fail("dashboard.compact-ai", "Compact AI insights missing");

if (dashboardHome.includes("displayName")) pass("dashboard.display-name-prop", "displayName prop used");
else fail("dashboard.display-name-prop", "displayName prop missing");

if (!dashboardPage.includes("getDailyBriefing")) pass("dashboard.page.no-briefing-fetch", "Briefing fetch removed");
else fail("dashboard.page.no-briefing-fetch", "Dashboard still fetches briefing");

if (!dashboardPage.includes("getProactiveCopilotSuggestions")) pass("dashboard.page.no-copilot-fetch", "Copilot fetch removed");
else fail("dashboard.page.no-copilot-fetch", "Dashboard still fetches copilot");

if (teamTypes.includes("displayName: string")) pass("team-context.display-name", "TeamContext includes displayName");
else fail("team-context.display-name", "TeamContext missing displayName");

if (kpiGrid.includes("DASHBOARD_PRIMARY_KPI_IDS")) pass("dashboard.kpi-primary-ids", "Primary KPI filter wired");
else fail("dashboard.kpi-primary-ids", "Primary KPI filter missing");

const primaryMatch = read("lib/dashboard/constants.ts").match(
  /DASHBOARD_PRIMARY_KPI_IDS = \[([\s\S]*?)\]/
);
const primaryCount = primaryMatch ? (primaryMatch[1].match(/"/g) ?? []).length / 2 : 0;
if (primaryCount === 3) pass("dashboard.kpi-count", "Exactly 3 primary KPIs");
else fail("dashboard.kpi-count", `Expected 3 primary KPIs, found ${primaryCount}`);

if (hero.includes("DashboardGreeting")) pass("dashboard.hero.greeting", "Dynamic greeting component wired");
else fail("dashboard.hero.greeting", "Dynamic greeting missing");

if (!hero.includes("userEmail")) pass("dashboard.hero.no-email-name", "Hero no longer uses email for name");
else fail("dashboard.hero.no-email-name", "Hero still references userEmail");

if (hero.includes("primaryAction")) pass("dashboard.context-cta", "Context-aware dashboard CTA");
else fail("dashboard.context-cta", "Dashboard CTA not context-aware");

if (read("lib/dashboard/primary-action.ts").includes("resolveDashboardPrimaryAction"))
  pass("dashboard.primary-action-resolver", "Primary action resolver exists");
else fail("dashboard.primary-action-resolver", "Primary action resolver missing");

if (read("lib/ai/insight-category.ts").includes("needs_attention"))
  pass("ai.insight-categories", "AI insight categories defined");
else fail("ai.insight-categories", "AI categories missing");

if (read("components/dashboard/dashboard-ai-insights-compact.tsx").includes("nextAction"))
  pass("dashboard.ai.next-action", "AI insights show next actions");
else fail("dashboard.ai.next-action", "AI insight next actions missing");

if (aiPage.includes("DailyAiBriefing") && aiPage.includes("getDailyBriefing"))
  pass("ai.page.briefing", "Daily briefing moved to Volt AI");
else fail("ai.page.briefing", "Daily briefing not on Volt AI page");

const activity = read("components/dashboard/dashboard-recent-activity.tsx");
if (!activity.includes("DASHBOARD_ACTIVITY_ICONS") && activity.includes("RelativeTime"))
  pass("dashboard.activity.lightweight", "Activity feed is chronological and lightweight");
else fail("dashboard.activity.lightweight", "Activity feed still heavy or missing chronology");

const tsc = spawnSync("npx", ["tsc", "--noEmit"], { cwd: root, encoding: "utf8" });
if (tsc.status === 0) pass("build.typescript", "tsc --noEmit");
else fail("build.typescript", (tsc.stderr || tsc.stdout || "tsc failed").slice(0, 500));

const outDir = path.join(root, "docs/validation/ux-1");
fs.mkdirSync(outDir, { recursive: true });

const qaResults = {
  generatedAt: new Date().toISOString(),
  phase: "UX-1",
  checks,
  summary: {
    pass: checks.filter((c) => c.status === "PASS").length,
    fail: checks.filter((c) => c.status === "FAIL").length,
    total: checks.length,
  },
};

fs.writeFileSync(path.join(outDir, "qa-results.json"), `${JSON.stringify(qaResults, null, 2)}\n`);

const failed = checks.filter((c) => c.status === "FAIL");
console.log(`UX-1 verify: ${qaResults.summary.pass}/${qaResults.summary.total} pass`);
for (const check of checks) {
  console.log(`  [${check.status}] ${check.id}${check.detail ? ` — ${check.detail}` : ""}`);
}

process.exit(failed.length > 0 ? 1 : 0);
