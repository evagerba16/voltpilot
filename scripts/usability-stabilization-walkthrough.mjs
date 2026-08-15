#!/usr/bin/env node
/**
 * Usability stabilization walkthrough — records contractor journey friction signals.
 * Run: npm run dev (port 3000) + BETA_TEST_* in .env.local
 *   node scripts/usability-stabilization-walkthrough.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.env.UX_E2E_BASE_URL ?? "http://localhost:3000";
const email = process.env.BETA_TEST_EMAIL;
const password = process.env.BETA_TEST_PASSWORD;
const outDir = path.join(root, "docs/validation/ux-stabilization");

const friction = [];

function record(severity, page, issue, detail) {
  friction.push({ severity, page, issue, detail });
}

if (!email || !password) {
  console.log("Set BETA_TEST_EMAIL and BETA_TEST_PASSWORD to run walkthrough.");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  // Dashboard
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const kpiCards = await page.locator("section h2").filter({ hasText: "Key metrics" }).count();
  const sections = await page.locator("main h2").count();
  if (sections > 5) {
    record("medium", "dashboard", "Many sections above fold", `${sections} h2 sections visible`);
  }

  const primaryCta = await page.getByRole("link").filter({ has: page.locator(".rounded-full") }).first().textContent().catch(() => null);
  if (primaryCta?.includes("customer")) {
    await page.goto(`${baseUrl}/customers?action=add`, { waitUntil: "networkidle" });
    const addDialogVisible = await page.getByRole("dialog").isVisible().catch(() => false);
    if (!addDialogVisible) {
      record("high", "dashboard→customers", "Extra click to add customer", "action=add did not open add dialog");
    }
  }

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const analyticsLinks = await page.getByRole("link", { name: /analytics/i }).count();
  if (analyticsLinks > 1) {
    record("low", "dashboard", "Duplicate Analytics links", `${analyticsLinks} links to analytics`);
  }

  // Projects list
  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  const pipelineHeading = await page.getByRole("heading", { name: /pipeline snapshot/i }).count();
  if (pipelineHeading === 0) {
    record("medium", "projects list", "Missing compact pipeline section", "Expected 3 KPI pipeline snapshot");
  }
  const projectKpis = await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: /pipeline snapshot/i }) })
    .locator("article, .rounded-2xl")
    .count();
  if (projectKpis > 3) {
    record("high", "projects list", "Information overload", `${projectKpis} KPI-style cards on list page`);
  }

  // First project detail if exists
  const projectLink = page.locator('a[href^="/projects/"]').filter({ hasNotText: "new" }).first();
  if (await projectLink.count()) {
    await projectLink.click();
    await page.waitForLoadState("networkidle");
    const tabCount = await page.getByRole("tab").count();
    if (tabCount >= 4) {
      record("low", "project detail", "Multiple tabs", `${tabCount} tabs — verify progressive disclosure holds`);
    }
    const jobLogBtn = page.getByRole("button", { name: /job log/i });
    if (await jobLogBtn.count()) {
      await jobLogBtn.click();
      const tabSelected = await page.getByRole("tab", { name: /job costing/i }).getAttribute("aria-selected");
      if (tabSelected !== "true") {
        record("medium", "project detail", "Primary CTA tab switch", "Add job log did not activate job costing tab");
      }
    }
  }

  // Customer detail
  await page.goto(`${baseUrl}/customers`, { waitUntil: "networkidle" });
  const customerRow = page.locator('a[href^="/customers/"]').first();
  if (await customerRow.count()) {
    await customerRow.click();
    await page.waitForLoadState("networkidle");
    const overviewMetrics = await page.getByText("At a glance").count();
    if (overviewMetrics === 0) {
      record("low", "customer detail", "Overview label", "At a glance section not found");
    }
    const emptyAttention = await page.getByText(/no open estimates/i).count();
    if (emptyAttention > 0) {
      record("medium", "customer detail", "Empty attention noise", "Placeholder shown when nothing needs attention");
    }
  }

  await page.screenshot({ path: path.join(outDir, "walkthrough-final.png"), fullPage: true });

  const report = {
    generatedAt: new Date().toISOString(),
    friction,
    summary: {
      high: friction.filter((f) => f.severity === "high").length,
      medium: friction.filter((f) => f.severity === "medium").length,
      low: friction.filter((f) => f.severity === "low").length,
    },
  };

  fs.writeFileSync(path.join(outDir, "friction-log.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Walkthrough: ${friction.length} friction point(s) recorded`);
  for (const item of friction) {
    console.log(`  [${item.severity}] ${item.page}: ${item.issue}`);
  }
} catch (error) {
  console.error("Walkthrough failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await browser.close();
}
