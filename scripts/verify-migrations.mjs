#!/usr/bin/env node

import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

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

async function verify() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    console.error("Missing database connection for verification.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const { rows: migrations } = await client.query(
      `select filename, applied_at
       from public.schema_migrations
       order by filename`
    );

    console.log("Applied migrations:");
    for (const row of migrations) {
      console.log(`  ${row.filename} (${row.applied_at})`);
    }

    const { rows: functions } = await client.query(
      `select proname, pg_get_function_identity_arguments(p.oid) as args
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and proname = 'ensure_user_organization'`
    );

    if (functions.length === 0) {
      throw new Error("ensure_user_organization is missing.");
    }

    console.log("Function OK:", `ensure_user_organization(${functions[0].args})`);
  } finally {
    await client.end();
  }
}

verify().catch((error) => {
  console.error("Verification failed:", error.message);
  process.exit(1);
});
