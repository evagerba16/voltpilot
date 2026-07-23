#!/usr/bin/env node

/**
 * Verify migrations 001–017 via Supabase REST (no DB password required).
 * Run: npm run db:verify-all
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../supabase/migrations");

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

loadEnvFile(path.resolve(__dirname, "../.env.local"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const rest = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
const zeroUuid = "00000000-0000-0000-0000-000000000001";
const zeroToken = "0".repeat(64);

const results = [];

async function probeTable(table) {
  const response = await fetch(`${rest}/${table}?select=id&limit=0`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const body = await response.text();
  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "missing_table" };
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
    return { ok: false, reason: "missing_column", body };
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
  return { ok: true, status: response.status, body: text };
}

function record(id, label, migration, result) {
  results.push({
    id,
    label,
    migration,
    status: result.ok ? "PASS" : "FAIL",
    reason: result.reason ?? null,
  });
  console.log(`${result.ok ? "PASS" : "FAIL"}  [${migration}] ${label}`);
}

console.log(`Project: ${supabaseUrl}`);
console.log("");

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
console.log(`Migration files on disk: ${migrationFiles.length} (${migrationFiles[0]} … ${migrationFiles.at(-1)})`);
console.log("");

console.log("001–010 Core");
for (const table of [
  "customers",
  "projects",
  "estimates",
  "estimate_line_items",
  "proposals",
  "company_settings",
  "organizations",
  "team_members",
  "team_invitations",
  "estimate_versions",
]) {
  record(`001-010:${table}`, `public.${table}`, "001–010", await probeTable(table));
}
record(
  "010:ensure_user_organization",
  "ensure_user_organization",
  "010",
  await probeRpc("ensure_user_organization", {
    p_user_id: zeroUuid,
    p_email: "verify@example.com",
    p_company_name: "Verify",
  })
);

console.log("");
console.log("011 AI Estimate Assistant");
for (const table of ["estimate_ai_sessions", "estimate_ai_messages"]) {
  record(`011:${table}`, `public.${table}`, "011", await probeTable(table));
}

console.log("");
console.log("012 Proposal workflow");
for (const table of [
  "proposal_revisions",
  "proposal_status_history",
  "proposal_emails",
  "proposal_views",
  "proposal_comments",
]) {
  record(`012:${table}`, `public.${table}`, "012", await probeTable(table));
}
for (const fn of [
  "get_proposal_by_portal_token",
  "record_proposal_portal_view",
  "submit_proposal_portal_response",
]) {
  const args =
    fn === "submit_proposal_portal_response"
      ? { p_token: zeroToken, p_action: "decline" }
      : { p_token: zeroToken };
  record(`012:${fn}`, fn, "012", await probeRpc(fn, args));
}

console.log("");
console.log("013 Analytics");
record("013:project_job_actuals", "public.project_job_actuals", "013", await probeTable("project_job_actuals"));
record(
  "013:get_analytics_executive_summary",
  "get_analytics_executive_summary",
  "013",
  await probeRpc("get_analytics_executive_summary", { p_organization_id: zeroUuid })
);

console.log("");
console.log("014 Portal signature payload");
const sigColumns = await probeColumns("proposals", [
  "id",
  "customer_signature_data",
  "customer_signed_at",
  "customer_signed_name",
]);
record(
  "014:signature_columns",
  "proposals signature columns",
  "014",
  sigColumns.ok ? { ok: true } : sigColumns
);

console.log("");
console.log("015 Proposal Builder 2");
record("015:proposal_media", "public.proposal_media", "015", await probeTable("proposal_media"));
const brandColumns = await probeColumns("proposals", [
  "customer_logo_url",
  "brand_primary_color",
  "brand_accent_color",
]);
record(
  "015:brand_columns",
  "proposals branding columns",
  "015",
  brandColumns.ok ? { ok: true } : brandColumns
);

console.log("");
console.log("016 Security hardening");
for (const fn of [
  "get_team_invitation_by_token",
  "accept_team_invitation_by_token",
  "submit_proposal_portal_comment",
]) {
  const args =
    fn === "submit_proposal_portal_comment"
      ? {
          p_token: zeroToken,
          p_author_name: "Verify",
          p_comment: "Migration verify probe",
        }
      : { p_token: zeroToken };
  record(`016:${fn}`, fn, "016", await probeRpc(fn, args));
}

console.log("");
console.log("017 Portal project status");
const portalResponse = await probeRpc("submit_proposal_portal_response", {
  p_token: zeroToken,
  p_action: "accept",
});
record(
  "017:submit_proposal_portal_response",
  "submit_proposal_portal_response (017 replaces 012)",
  "017",
  portalResponse.ok ? { ok: true } : portalResponse
);
if (portalResponse.ok && portalResponse.body?.includes("signature is required")) {
  console.log("  note: 017 signature validation response detected (function is current)");
}

console.log("");
const failed = results.filter((r) => r.status === "FAIL");
console.log(`Summary: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
  console.log("");
  console.log("Failed checks:");
  for (const item of failed) {
    console.log(`  - ${item.label} (${item.migration})`);
  }
  console.log("");
  console.log("Apply pending migrations:");
  console.log("  1. Add SUPABASE_DB_PASSWORD to .env.local");
  console.log("  2. npm run db:migrate");
  console.log("  Or paste supabase/sql-editor/pending_migrations.sql in Supabase SQL Editor");
  process.exit(1);
}

console.log("All migration probes passed.");
