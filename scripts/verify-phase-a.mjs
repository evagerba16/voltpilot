#!/usr/bin/env node
/**
 * Phase A verification: migrations, build, and module wiring checks.
 * Run: npm run phase-a:verify
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const results = [];

function pass(id, detail) {
  results.push({ id, status: "pass", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail) {
  results.push({ id, status: "fail", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd, id) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe" });
    pass(id, cmd);
    return true;
  } catch (error) {
    const message =
      error instanceof Error && "stderr" in error
        ? String(error.stderr).slice(-400)
        : "command failed";
    fail(id, message);
    return false;
  }
}

console.log("Phase A verification\n");

run("node scripts/verify-migration-019-021.mjs", "migrations.019-021");

const queries = fs.readFileSync(path.join(root, "lib/customers/queries.ts"), "utf8");
if (queries.includes("openContractValue") && !queries.includes("outstandingBalance")) {
  pass("crm.open-contract-value", "openContractValue wired in queries");
} else {
  fail("crm.open-contract-value", "missing openContractValue or outstandingBalance still present");
}

const actions = fs.readFileSync(
  path.join(root, "app/(dashboard)/projects/job-costing-actions.ts"),
  "utf8"
);
for (const fn of [
  "updateProjectJobLog",
  "updateProjectChangeOrder",
  "deleteProjectChangeOrder",
]) {
  actions.includes(`export async function ${fn}`)
    ? pass(`job-costing.${fn}`, "exported")
    : fail(`job-costing.${fn}`, "missing");
}

const budgetPanel = fs.readFileSync(
  path.join(root, "components/projects/project-budget-panel.tsx"),
  "utf8"
);
budgetPanel.includes("@deprecated")
  ? pass("job-costing.budget-panel-deprecated", "marked deprecated")
  : fail("job-costing.budget-panel-deprecated", "missing @deprecated");

run("npx tsc --noEmit", "build.typescript");
run("npm run build", "build.next");

const failed = results.filter((row) => row.status === "fail").length;
const reportPath = path.join(root, "docs/validation/phase-a/qa-results.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2)
);

console.log(`\nSummary: ${results.length - failed}/${results.length} passed`);
console.log(`Report: docs/validation/phase-a/qa-results.json`);

process.exit(failed > 0 ? 1 : 0);
