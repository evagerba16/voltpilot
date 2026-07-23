#!/usr/bin/env node

/**
 * Regression guard: default builds use .next; optional local builds use .next-build.
 * Run: npm run dev:verify-cache
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const failures = [];

if (config.includes('distDir: process.env.NEXT_DIST_DIR ?? ".next-build"')) {
  failures.push("next.config.ts must not default distDir to .next-build");
}

if (config.includes("VERCEL === \"1\"")) {
  failures.push("next.config.ts must not rely on VERCEL env detection for distDir");
}

if (!pkg.scripts["build:local"]?.includes("VOLTPILOT_DIST_DIR=.next-build")) {
  failures.push('package.json "build:local" must set VOLTPILOT_DIST_DIR=.next-build');
}

if (pkg.scripts.prebuild?.includes("prebuild-guard")) {
  failures.push('package.json must not run prebuild-guard (blocks standard .next builds)');
}

if (failures.length > 0) {
  console.error("Dev cache isolation check failed:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("OK: default build uses .next; build:local uses .next-build.");
