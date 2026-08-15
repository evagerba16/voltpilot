#!/usr/bin/env node
/**
 * Verify migration 023: table, RLS, persistence round-trip, rollback SQL exists.
 * Run: node scripts/verify-migration-023.mjs
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

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("FAIL  Missing SUPABASE_DB_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  const table = await client.query(
    `select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'copilot_recommendations'`
  );
  console.log(table.rowCount ? "PASS  table exists" : "FAIL  table missing");

  const rls = await client.query(
    `select relrowsecurity from pg_class
     where relname = 'copilot_recommendations'`
  );
  console.log(
    rls.rows[0]?.relrowsecurity ? "PASS  RLS enabled" : "FAIL  RLS disabled"
  );

  const policies = await client.query(
    `select policyname from pg_policies where tablename = 'copilot_recommendations'`
  );
  console.log(
    policies.rowCount >= 2
      ? `PASS  ${policies.rowCount} RLS policies`
      : `FAIL  expected 2+ policies, got ${policies.rowCount}`
  );

  const migration = await client.query(
    `select 1 from schema_migrations where filename = '023_copilot_recommendations.sql'`
  );
  console.log(
    migration.rowCount ? "PASS  schema_migrations record" : "FAIL  migration not recorded"
  );

  const org = await client.query(`select id from organizations limit 1`);
  const user = await client.query(`select id from auth.users limit 1`);

  if (!org.rows[0] || !user.rows[0]) {
    console.log("SKIP  persistence round-trip (no org/user seed data)");
  } else {
    const testId = crypto.randomUUID();
    const entityId = crypto.randomUUID();

    await client.query(
      `insert into copilot_recommendations (
         id, organization_id, user_id, module, entity_type, entity_id,
         recommendation_type, severity, title, explanation, payload, reasoning, status
       ) values ($1, $2, $3, 'estimate', 'estimate', $4, 'business_insight', 'info', 'Test', 'Test', '{}', '{}', 'pending')`,
      [testId, org.rows[0].id, user.rows[0].id, entityId]
    );

    const read = await client.query(`select id from copilot_recommendations where id = $1`, [
      testId,
    ]);
    console.log(
      read.rowCount === 1 ? "PASS  persistence insert/select" : "FAIL  persistence read"
    );

    await client.query(`delete from copilot_recommendations where id = $1`, [testId]);
    const gone = await client.query(`select id from copilot_recommendations where id = $1`, [
      testId,
    ]);
    console.log(
      gone.rowCount === 0 ? "PASS  persistence delete (rollback row)" : "FAIL  delete failed"
    );
  }

  const rollbackPath = path.resolve(
    __dirname,
    "../supabase/migrations/023_copilot_recommendations.sql"
  );
  console.log(
    fs.existsSync(rollbackPath)
      ? "PASS  rollback source file present (manual: drop table copilot_recommendations)"
      : "FAIL  migration file missing"
  );
}

main()
  .catch((error) => {
    console.error("FAIL ", error.message);
    process.exit(1);
  })
  .finally(() => client.end().catch(() => null));
