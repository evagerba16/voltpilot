#!/usr/bin/env node

/** Probe every proposals column the app expects. Run: node scripts/verify-proposals-schema.mjs */

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
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(path.resolve(__dirname, "../.env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

const PROPOSAL_COLUMNS = [
  { name: "id", migration: "004" },
  { name: "user_id", migration: "004" },
  { name: "organization_id", migration: "010" },
  { name: "project_id", migration: "004" },
  { name: "estimate_id", migration: "004" },
  { name: "title", migration: "004" },
  { name: "status", migration: "004/012" },
  { name: "amount", migration: "004" },
  { name: "sent_at", migration: "004" },
  { name: "decided_at", migration: "004" },
  { name: "created_at", migration: "004" },
  { name: "updated_at", migration: "004" },
  { name: "proposal_number", migration: "009" },
  { name: "proposal_date", migration: "009" },
  { name: "scope_of_work", migration: "009" },
  { name: "materials_summary", migration: "009" },
  { name: "labor_summary", migration: "009" },
  { name: "equipment_summary", migration: "009" },
  { name: "show_line_item_breakdown", migration: "009" },
  { name: "exclusions", migration: "009" },
  { name: "terms_and_conditions", migration: "009" },
  { name: "warranty_information", migration: "009" },
  { name: "customer_signature_name", migration: "009" },
  { name: "customer_signature_title", migration: "009" },
  { name: "contractor_signature_name", migration: "009" },
  { name: "contractor_signature_title", migration: "009" },
  { name: "notes", migration: "009" },
  { name: "estimate_snapshot", migration: "009" },
  { name: "company_snapshot", migration: "009" },
  { name: "last_autosaved_at", migration: "009" },
  { name: "expiration_date", migration: "012" },
  { name: "assumptions", migration: "012" },
  { name: "internal_notes", migration: "012" },
  { name: "public_token", migration: "012" },
  { name: "viewed_at", migration: "012" },
  { name: "first_viewed_at", migration: "012" },
  { name: "accepted_at", migration: "012" },
  { name: "declined_at", migration: "012" },
  { name: "archived_at", migration: "012" },
  { name: "customer_signature_data", migration: "012" },
  { name: "customer_signed_at", migration: "012" },
  { name: "customer_signed_name", migration: "012" },
  { name: "pdf_generated_at", migration: "012" },
  { name: "pdf_page_count", migration: "012" },
  { name: "last_emailed_at", migration: "012" },
  { name: "email_send_count", migration: "012" },
];

async function probeColumn(column) {
  const response = await fetch(`${base}/proposals?select=${column}&limit=0`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const body = await response.text();
  if (body.includes("Could not find the table")) {
    return { ok: false, reason: "no_table" };
  }
  if (body.includes("does not exist")) {
    return { ok: false, reason: "missing" };
  }
  return { ok: true };
}

console.log(`Project: ${supabaseUrl}\nProposals column audit:\n`);

const missing = [];
const present = [];

for (const col of PROPOSAL_COLUMNS) {
  const result = await probeColumn(col.name);
  if (result.ok) {
    present.push(col);
    console.log(`  OK   proposals.${col.name} (${col.migration})`);
  } else {
    missing.push(col);
    console.log(`  MISS proposals.${col.name} — migration ${col.migration}`);
  }
}

console.log(`\n${present.length} present, ${missing.length} missing.`);

if (missing.some((c) => c.migration === "012")) {
  console.log("\nFix: run supabase/sql-editor/012_proposals_workflow.sql in SQL Editor.");
  process.exit(1);
}
