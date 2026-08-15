#!/usr/bin/env node
/**
 * Verify migrations 019–021: Customer CRM + Job Costing schema.
 * Run: npm run db:verify-phase-a-migrations
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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
loadEnvFile(path.resolve(__dirname, "../.env"));

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("FAIL  Missing SUPABASE_DB_URL or DATABASE_URL");
  process.exit(1);
}

const results = [];

function pass(id, detail) {
  results.push({ id, status: "pass", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail) {
  results.push({ id, status: "fail", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

async function tableExists(client, name) {
  const { rows } = await client.query(
    `select 1 from information_schema.tables
     where table_schema = 'public' and table_name = $1`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `select 1 from information_schema.columns
     where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function rlsEnabled(client, table) {
  const { rows } = await client.query(
    `select relrowsecurity from pg_class where relname = $1`,
    [table]
  );
  return rows[0]?.relrowsecurity === true;
}

async function policyCount(client, table) {
  const { rows } = await client.query(
    `select count(*)::int as count from pg_policies where tablename = $1`,
    [table]
  );
  return rows[0]?.count ?? 0;
}

async function bucketExists(client, id) {
  const { rows } = await client.query(`select 1 from storage.buckets where id = $1`, [id]);
  return rows.length > 0;
}

async function migrationRecorded(client, filename) {
  const { rows } = await client.query(
    `select 1 from public.schema_migrations where filename = $1`,
    [filename]
  );
  return rows.length > 0;
}

async function main() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log("=== Migration 019 — Customer CRM ===\n");

    for (const table of ["customer_notes", "customer_documents"]) {
      (await tableExists(client, table))
        ? pass(`019.table.${table}`, "exists")
        : fail(`019.table.${table}`, "missing");
      if (await tableExists(client, table)) {
        (await rlsEnabled(client, table))
          ? pass(`019.rls.${table}`, "enabled")
          : fail(`019.rls.${table}`, "disabled");
        const count = await policyCount(client, table);
        const expected = table === "customer_notes" ? 4 : 3;
        count >= expected
          ? pass(`019.policies.${table}`, `${count} policies`)
          : fail(`019.policies.${table}`, `expected ${expected}+, got ${count}`);
      }
    }

    (await bucketExists(client, "customer-documents"))
      ? pass("019.bucket.customer-documents", "exists")
      : fail("019.bucket.customer-documents", "missing");

    (await migrationRecorded(client, "019_customer_crm.sql"))
      ? pass("019.schema_migrations", "recorded")
      : fail("019.schema_migrations", "not recorded");

    console.log("\n=== Migration 020 — Customer CRM enhancements ===\n");

    for (const [table, column] of [
      ["customers", "status"],
      ["customer_notes", "is_pinned"],
      ["customer_documents", "category"],
    ]) {
      (await columnExists(client, table, column))
        ? pass(`020.column.${table}.${column}`, "exists")
        : fail(`020.column.${table}.${column}`, "missing");
    }

    (await migrationRecorded(client, "020_customer_crm_enhancements.sql"))
      ? pass("020.schema_migrations", "recorded")
      : fail("020.schema_migrations", "not recorded");

    console.log("\n=== Migration 021 — Job costing & field logs ===\n");

    for (const table of [
      "project_change_orders",
      "project_job_logs",
      "project_job_log_photos",
      "project_job_actuals",
    ]) {
      (await tableExists(client, table))
        ? pass(`021.table.${table}`, "exists")
        : fail(`021.table.${table}`, "missing");
    }

    for (const table of [
      "project_change_orders",
      "project_job_logs",
      "project_job_log_photos",
    ]) {
      if (await tableExists(client, table)) {
        (await rlsEnabled(client, table))
          ? pass(`021.rls.${table}`, "enabled")
          : fail(`021.rls.${table}`, "disabled");
      }
    }

    (await bucketExists(client, "project-job-photos"))
      ? pass("021.bucket.project-job-photos", "exists")
      : fail("021.bucket.project-job-photos", "missing");

    (await migrationRecorded(client, "021_project_job_costing.sql"))
      ? pass("021.schema_migrations", "recorded")
      : fail("021.schema_migrations", "not recorded");

    const sqlEditor019 = path.resolve(
      __dirname,
      "../supabase/migrations/019_customer_crm.sql"
    );
    fs.existsSync(sqlEditor019)
      ? pass("files.migration-019", "source present")
      : fail("files.migration-019", "missing");
  } finally {
    await client.end().catch(() => null);
  }

  const failed = results.filter((row) => row.status === "fail").length;
  console.log(`\nSummary: ${results.length - failed}/${results.length} passed`);

  const reportPath = path.resolve(__dirname, "../docs/validation/phase-a/migration-verification.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2)
  );
  console.log(`Report: docs/validation/phase-a/migration-verification.json`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("FAIL ", error.message);
  process.exit(1);
});
