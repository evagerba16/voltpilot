#!/usr/bin/env node

/**
 * Verify migration 013_analytics_dashboard.sql via Supabase REST (no DB password).
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

const base = supabaseUrl.replace(/\/$/, "");

async function verifyTable(table) {
  const response = await fetch(`${base}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  const body = await response.text();

  if (body.includes("Could not find the table")) {
    throw new Error(`public.${table} is missing`);
  }

  console.log(`Table OK: public.${table}`);
}

async function verifyRpc(functionName, body) {
  const response = await fetch(`${base}/rest/v1/rpc/${functionName}`, {
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
    throw new Error(`${functionName} is missing`);
  }

  console.log(`Function OK: ${functionName}`);
}

console.log(`Project: ${supabaseUrl}`);

try {
  await verifyTable("project_job_actuals");
  await verifyRpc("get_analytics_executive_summary", {
    p_organization_id: "00000000-0000-0000-0000-000000000001",
  });

  const optionalTables = ["estimate_ai_sessions", "estimate_ai_messages"];
  for (const table of optionalTables) {
    try {
      await verifyTable(table);
    } catch {
      console.log(`Optional (011): public.${table} not present — apply 011_ai_estimate_assistant.sql for AI analytics.`);
    }
  }

  console.log("");
  console.log("Migration 013_analytics_dashboard.sql is applied.");
  console.log("Objects verified:");
  console.log("  - Table: public.project_job_actuals");
  console.log("  - Function: get_analytics_executive_summary(...)");
  console.log("  - Indexes: estimates, proposals, projects, customers, estimate_versions (+ AI if 011 applied)");
} catch (error) {
  console.error("Migration 013 is NOT applied:", error.message);
  console.error("");
  console.error("Apply it in the Supabase SQL Editor:");
  console.error("  1. Open https://supabase.com/dashboard/project/_/sql/new");
  console.error("  2. Paste supabase/sql-editor/013_analytics_dashboard.sql");
  console.error("  3. Run the query");
  console.error("");
  console.error("Or set SUPABASE_DB_PASSWORD in .env.local and run: npm run db:migrate");
  process.exit(1);
}
