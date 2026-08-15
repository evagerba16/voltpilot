#!/usr/bin/env node
/**
 * Capture post-UX-1 dashboard screenshot (requires auth credentials in env).
 *
 * Usage:
 *   BETA_TEST_EMAIL=... BETA_TEST_PASSWORD=... node scripts/capture-ux-1-dashboard.mjs
 * Optional:
 *   UX_E2E_BASE_URL=http://localhost:3000
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "docs/validation/ux-1");
const baseUrl = process.env.UX_E2E_BASE_URL ?? "http://localhost:3000";
const email = process.env.BETA_TEST_EMAIL;
const password = process.env.BETA_TEST_PASSWORD;

if (!email || !password) {
  console.log("Skipping screenshot capture — BETA_TEST_EMAIL / BETA_TEST_PASSWORD not set.");
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
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(outDir, "after-dashboard.png"),
    fullPage: true,
  });
  console.log(`Saved ${path.join(outDir, "after-dashboard.png")}`);
} catch (error) {
  console.error("Screenshot capture failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await browser.close();
}
