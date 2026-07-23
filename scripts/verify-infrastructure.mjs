#!/usr/bin/env node

/**
 * Verify migrations 011–013 infrastructure via Supabase REST (no DB password).
 * Run: npm run db:verify-infrastructure
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

const base = supabaseUrl.replace(/\/$/, "");
const rest = `${base}/rest/v1`;

async function probeTable(table) {
  const response = await fetch(`${rest}/${table}?select=id&limit=0`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const body = await response.text();
  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "missing_table", body };
  }
  return { ok: true, status: response.status };
}

async function probeColumns(table, columns) {
  const select = columns.join(",");
  const response = await fetch(`${rest}/${table}?select=${select}&limit=0`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const body = await response.text();
  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "missing_table" };
  }
  if (body.includes("column") && body.includes("does not exist")) {
    const match = body.match(/column [^.]+\.(\w+) does not exist/i);
    return { ok: false, reason: "missing_column", column: match?.[1] ?? "unknown" };
  }
  return { ok: true };
}

async function probeRpc(name, body = {}) {
  const response = await fetch(`${rest}/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (text.includes("Could not find the function")) {
    return { ok: false, reason: "missing_function" };
  }
  return { ok: true, status: response.status };
}

function report(label, result, migration) {
  if (result.ok) {
    console.log(`  OK   ${label}`);
    return 0;
  }
  console.log(`  FAIL ${label} — apply ${migration}`);
  return 1;
}

console.log(`Project: ${supabaseUrl}`);
console.log(
  `OpenAI: ${openAiKey ? "configured (run npm run ai:verify to test)" : "not set — AI features use rules-only or fail"}`
);
console.log("");

let failures = 0;

console.log("Migration 011 — AI Estimate Assistant");
for (const table of ["estimate_ai_sessions", "estimate_ai_messages"]) {
  failures += report(`public.${table}`, await probeTable(table), "011_ai_estimate_assistant.sql");
}

console.log("");
console.log("Migration 012 — Proposal workflow");
for (const table of [
  "proposal_revisions",
  "proposal_status_history",
  "proposal_emails",
  "proposal_views",
  "proposal_comments",
]) {
  failures += report(`public.${table}`, await probeTable(table), "012_proposals_workflow.sql");
}

const proposal012Columns = [
  "public_token",
  "expiration_date",
  "viewed_at",
  "accepted_at",
  "declined_at",
  "archived_at",
  "email_send_count",
];
const proposalColProbe = await probeColumns("proposals", [
  "id",
  ...proposal012Columns,
]);
if (proposalColProbe.ok) {
  console.log("  OK   proposals workflow columns");
} else {
  failures += 1;
  console.log(
    `  FAIL proposals.${proposalColProbe.column ?? "columns"} — apply 012_proposals_workflow.sql`
  );
}

console.log("");
console.log("Migration 012 — Portal RPC functions");
for (const fn of [
  "get_proposal_by_portal_token",
  "record_proposal_portal_view",
  "submit_proposal_portal_response",
]) {
  const args =
    fn === "get_proposal_by_portal_token"
      ? { p_token: "0000000000000000000000000000000000000000000000000000000000000000" }
      : fn === "record_proposal_portal_view"
        ? { p_token: "0000000000000000000000000000000000000000000000000000000000000000" }
        : {
            p_token: "0000000000000000000000000000000000000000000000000000000000000000",
            p_action: "decline",
          };
  failures += report(fn, await probeRpc(fn, args), "012_proposals_workflow.sql");
}

console.log("");
console.log("Migration 013 — Analytics (optional)");
const analyticsTable = await probeTable("project_job_actuals");
if (analyticsTable.ok) {
  console.log("  OK   public.project_job_actuals");
  failures += report(
    "get_analytics_executive_summary",
    await probeRpc("get_analytics_executive_summary", {
      p_organization_id: "00000000-0000-0000-0000-000000000001",
    }),
    "013_analytics_dashboard.sql"
  );
} else {
  console.log("  SKIP public.project_job_actuals — apply 013_analytics_dashboard.sql when ready");
}

console.log("");
console.log("Core platform (001–010)");
failures += report(
  "ensure_user_organization",
  await probeRpc("ensure_user_organization", {
    p_user_id: "00000000-0000-0000-0000-000000000001",
    p_email: "verify@example.com",
    p_company_name: "Verification Check",
  }),
  "010_team_management.sql"
);
for (const table of ["organizations", "team_members", "estimate_versions"]) {
  failures += report(`public.${table}`, await probeTable(table), "001–010 schema");
}

console.log("");
if (failures > 0) {
  console.log(`Infrastructure verification: ${failures} issue(s) found.`);
  console.log("");
  console.log("Apply pending migrations:");
  console.log("  Option A — SQL Editor: paste supabase/sql-editor/011_012_infrastructure.sql");
  console.log("  Option B — CLI: add SUPABASE_DB_PASSWORD to .env.local, then npm run db:migrate");
  process.exit(1);
}

console.log("Infrastructure verification: all required objects present.");
