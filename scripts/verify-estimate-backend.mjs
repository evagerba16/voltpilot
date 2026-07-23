#!/usr/bin/env node

/**
 * Backend schema probe for estimate workflow tables/columns (REST, no DB password).
 * Run: npm run estimates:verify-backend
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional.
  }
}

loadEnvFile(path.resolve(__dirname, "../.env.local"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiKey = process.env.OPENAI_API_KEY?.trim();

if (!supabaseUrl || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const base = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

async function probeTable(table) {
  const response = await fetch(`${base}/${table}?select=id&limit=0`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const body = await response.text();

  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "missing_table" };
  }

  return { ok: true, status: response.status };
}

async function probeColumns(table, columns) {
  const select = columns.join(",");
  const response = await fetch(`${base}/${table}?select=${select}&limit=0`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const body = await response.text();

  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "missing_table", body };
  }

  if (body.includes("column") && body.includes("does not exist")) {
    const match = body.match(/column [^.]+\.(\w+) does not exist/i);
    return {
      ok: false,
      reason: "missing_column",
      column: match?.[1] ?? "unknown",
      body,
    };
  }

  return { ok: true, status: response.status };
}

const tables = [
  { name: "estimate_line_items", migration: "003_estimates.sql / 006_estimates_enhanced.sql" },
  { name: "estimate_versions", migration: "006_estimates_enhanced.sql (+ 010 for organization_id)" },
  { name: "estimate_ai_sessions", migration: "011_ai_estimate_assistant.sql" },
  { name: "estimate_ai_messages", migration: "011_ai_estimate_assistant.sql" },
  { name: "proposal_status_history", migration: "012_proposals_workflow.sql" },
  { name: "proposal_revisions", migration: "012_proposals_workflow.sql" },
];

const estimateColumns = [
  "id",
  "project_id",
  "title",
  "notes",
  "status",
  "overhead_percent",
  "contingency_percent",
  "tax_percent",
  "profit_margin_percent",
  "direct_cost_total",
  "labor_total",
  "materials_total",
  "equipment_total",
  "subcontractors_total",
  "miscellaneous_total",
  "overhead_amount",
  "contingency_amount",
  "profit_amount",
  "tax_amount",
  "gross_margin_percent",
  "selling_price",
  "grand_total",
  "last_autosaved_at",
  "organization_id",
];

const proposalColumns = [
  "id",
  "project_id",
  "estimate_id",
  "proposal_number",
  "estimate_snapshot",
  "company_snapshot",
  "organization_id",
];

const versionColumns = ["id", "estimate_id", "organization_id", "version_number", "snapshot"];

console.log(`Project: ${supabaseUrl}`);
console.log(`OpenAI configured: ${openAiKey ? "yes" : "no (Review uses rules-only; AI Estimate will fail)"}`);
console.log("");

let failures = 0;

console.log("Estimate workflow tables:");
for (const table of tables) {
  const result = await probeTable(table.name);
  if (result.ok) {
    console.log(`  OK  public.${table.name}`);
  } else {
    failures += 1;
    console.log(`  MISSING  public.${table.name} — apply ${table.migration}`);
  }
}

console.log("");
console.log("Estimates columns (006 enhanced fields):");
const estimateProbe = await probeColumns("estimates", estimateColumns);
if (estimateProbe.ok) {
  console.log("  OK  all required estimate columns exist");
} else if (estimateProbe.reason === "missing_column") {
  failures += 1;
  console.log(`  MISSING  estimates.${estimateProbe.column} — apply 006_estimates_enhanced.sql`);
} else {
  failures += 1;
  console.log("  MISSING  public.estimates");
}

console.log("");
console.log("Proposal generation columns:");
const proposalProbe = await probeColumns("proposals", proposalColumns);
if (proposalProbe.ok) {
  console.log("  OK  all required proposal columns exist");
} else if (proposalProbe.reason === "missing_column") {
  failures += 1;
  console.log(`  MISSING  proposals.${proposalProbe.column} — apply 009_proposals_enhanced.sql`);
} else {
  failures += 1;
  console.log("  MISSING  public.proposals");
}

console.log("");
console.log("Version history columns:");
const versionProbe = await probeColumns("estimate_versions", versionColumns);
if (versionProbe.ok) {
  console.log("  OK  estimate_versions schema complete");
} else if (versionProbe.reason === "missing_table") {
  failures += 1;
  console.log("  MISSING  public.estimate_versions — apply 006_estimates_enhanced.sql");
} else if (versionProbe.reason === "missing_column") {
  failures += 1;
  console.log(
    `  MISSING  estimate_versions.${versionProbe.column} — apply 010_team_management.sql`
  );
} else {
  failures += 1;
  console.log("  FAILED  estimate_versions probe");
}

console.log("");
if (failures > 0) {
  console.log(`Backend schema probe: ${failures} issue(s) found.`);
  process.exit(1);
}

console.log("Backend schema probe: all estimate workflow objects present.");
