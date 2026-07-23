#!/usr/bin/env node

/**
 * Regression guard: dev and production build caches must stay separate.
 * Run: node scripts/verify-dev-cache-isolation.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const failures = [];

if (!config.includes('process.env.VERCEL === "1"') || !config.includes(".next-build")) {
  failures.push(
    "next.config.ts must use .next-build locally and .next when VERCEL=1"
  );
}

if (!pkg.scripts.dev.includes("NEXT_DIST_DIR=.next")) {
  failures.push('package.json "dev" must set NEXT_DIST_DIR=.next');
}

if (!pkg.scripts.prebuild?.includes("prebuild-guard")) {
  failures.push('package.json "prebuild" must run scripts/prebuild-guard.mjs');
}

if (failures.length > 0) {
  console.error("Dev cache isolation check failed:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  "OK: dev (.next), local build (.next-build), and Vercel build (.next) are configured."
);
