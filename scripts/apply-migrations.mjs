#!/usr/bin/env node

import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../supabase/migrations");

function loadEnvFile(filePath) {
  try {
    const content = fsSync.readFileSync(filePath, "utf8");
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

function getDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/([^.]+)\.supabase\.co/
    )?.[1];

  if (password && projectRef) {
    const host = process.env.SUPABASE_DB_HOST ?? `db.${projectRef}.supabase.co`;
    const port = process.env.SUPABASE_DB_PORT ?? "5432";
    const user = process.env.SUPABASE_DB_USER ?? "postgres";
    const database = process.env.SUPABASE_DB_NAME ?? "postgres";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  return null;
}

async function listMigrationFiles() {
  const files = await fs.readdir(migrationsDir);
  return files
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `select 1
     from information_schema.tables
     where table_schema = 'public' and table_name = $1`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(client, tableName, columnName) {
  const { rows } = await client.query(
    `select 1
     from information_schema.columns
     where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function functionExists(client, functionName) {
  const { rows } = await client.query(
    `select 1
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = $1`,
    [functionName]
  );
  return rows.length > 0;
}

async function functionHasArgument(client, functionName, argumentName) {
  const { rows } = await client.query(
    `select pg_get_function_identity_arguments(p.oid) as args
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = $1
     limit 1`,
    [functionName]
  );
  return rows[0]?.args?.includes(argumentName) ?? false;
}

/** Detect whether migration objects already exist (e.g. applied via SQL Editor). */
const migrationAppliedProbes = {
  "001_customers.sql": (client) => tableExists(client, "customers"),
  "002_projects.sql": (client) => tableExists(client, "projects"),
  "003_estimates.sql": (client) => tableExists(client, "estimates"),
  "004_proposals.sql": (client) => tableExists(client, "proposals"),
  "005_projects_enhanced.sql": (client) =>
    columnExists(client, "projects", "general_contractor"),
  "006_estimates_enhanced.sql": (client) =>
    tableExists(client, "estimate_versions"),
  "007_projects_archive_status.sql": (client) =>
    columnExists(client, "projects", "pre_archive_status"),
  "008_company_settings.sql": (client) => tableExists(client, "company_settings"),
  "009_proposals_enhanced.sql": (client) =>
    columnExists(client, "proposals", "proposal_number"),
  "010_team_management.sql": async (client) =>
    (await tableExists(client, "organizations")) &&
    (await functionExists(client, "ensure_user_organization")),
  "011_ai_estimate_assistant.sql": (client) =>
    tableExists(client, "estimate_ai_sessions"),
  "012_proposals_workflow.sql": (client) =>
    tableExists(client, "proposal_revisions"),
  "013_analytics_dashboard.sql": (client) =>
    tableExists(client, "project_job_actuals"),
  "014_proposal_portal_signature.sql": (client) =>
    columnExists(client, "proposals", "customer_signature_data"),
  "015_proposal_builder_2.sql": (client) =>
    tableExists(client, "proposal_media"),
  "016_security_hardening.sql": (client) =>
    functionExists(client, "get_team_invitation_by_token"),
  "017_portal_project_status.sql": (client) =>
    functionHasArgument(client, "submit_proposal_portal_response", "p_comment"),
  "018_stripe_subscriptions.sql": (client) =>
    tableExists(client, "organization_subscriptions"),
};

async function isMigrationRecorded(client, filename) {
  const { rows } = await client.query(
    "select filename from public.schema_migrations where filename = $1",
    [filename]
  );
  return rows.length > 0;
}

async function recordMigration(client, filename) {
  await client.query(
    `insert into public.schema_migrations (filename)
     values ($1)
     on conflict (filename) do nothing`,
    [filename]
  );
}

async function isMigrationAlreadyApplied(client, filename) {
  const probe = migrationAppliedProbes[filename];
  if (!probe) {
    return false;
  }
  return probe(client);
}

async function applyMigrations() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    console.error(
      "Missing database connection. Set one of:\n" +
        "  SUPABASE_DB_URL\n" +
        "  DATABASE_URL\n" +
        "  SUPABASE_DB_PASSWORD (with NEXT_PUBLIC_SUPABASE_URL / SUPABASE_PROJECT_REF)"
    );
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const files = await listMigrationFiles();

    for (const file of files) {
      if (await isMigrationRecorded(client, file)) {
        console.log(`skip  ${file}`);
        continue;
      }

      if (await isMigrationAlreadyApplied(client, file)) {
        await recordMigration(client, file);
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply ${file}`);
      await client.query(sql);
      await recordMigration(client, file);
    }

    const { rows: functionRows } = await client.query(
      `select proname, pg_get_function_identity_arguments(p.oid) as args
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and proname = 'ensure_user_organization'`
    );

    if (functionRows.length === 0) {
      throw new Error("ensure_user_organization function was not created.");
    }

    console.log("verified ensure_user_organization:", functionRows[0].args);

    const { rows: tableRows } = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in ('organizations', 'team_members', 'team_invitations')
       order by table_name`
    );

    console.log(
      "verified team tables:",
      tableRows.map((row) => row.table_name).join(", ")
    );
  } finally {
    await client.end();
  }
}

applyMigrations().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
