#!/usr/bin/env node

/**
 * Verify Supabase RPC availability via REST API (no database password required).
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
    // Optional local env file.
  }
}

loadEnvFile(path.resolve(__dirname, "../.env.local"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
  process.exit(1);
}

const rpcUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/ensure_user_organization`;

async function verifyFunction() {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      p_user_id: "00000000-0000-0000-0000-000000000001",
      p_email: "verify@example.com",
      p_company_name: "Verification Check",
    }),
  });

  const body = await response.text();

  if (body.includes("Could not find the function")) {
    console.error("MISSING: ensure_user_organization is not in the schema cache.");
    console.error("Run supabase/sql-editor/010_team_management.sql in the SQL Editor.");
    process.exit(1);
  }

  // Function exists. Unauthenticated calls may fail with FK/permission errors — that's OK.
  if (
    response.status === 401 ||
    response.status === 403 ||
    body.includes("permission denied") ||
    body.includes("violates foreign key") ||
    body.includes("JWT")
  ) {
    console.log("Function OK: ensure_user_organization(p_user_id uuid, p_email text, p_company_name text)");
    return;
  }

  if (response.ok) {
    console.log("Function OK: ensure_user_organization(p_user_id uuid, p_email text, p_company_name text)");
    return;
  }

  // Any other response still means the function was found.
  if (!body.includes("function") || !body.includes("not find")) {
    console.log("Function OK: ensure_user_organization(p_user_id uuid, p_email text, p_company_name text)");
    console.log(`RPC probe status: ${response.status}`);
    return;
  }

  console.error("Unexpected RPC response:", response.status, body);
  process.exit(1);
}

async function verifyTables() {
  const tables = [
    "customers",
    "projects",
    "estimates",
    "proposals",
    "company_settings",
    "organizations",
    "team_members",
    "team_invitations",
  ];
  const base = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  for (const table of tables) {
    const response = await fetch(`${base}/${table}?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    const body = await response.text();

    if (body.includes("Could not find the table")) {
      console.error(`MISSING: public.${table}`);
      if (["customers", "projects", "company_settings"].includes(table)) {
        console.error(
          "Base tables are missing. Run supabase/sql-editor/complete_schema_001-010.sql instead of 010 alone."
        );
      }
      process.exit(1);
    }

    console.log(`Table OK: public.${table}`);
  }
}

console.log(`Project: ${supabaseUrl}`);
await verifyFunction();
await verifyTables();
console.log("All team-management objects are available via Supabase REST.");
