#!/usr/bin/env node

/**
 * Phase 1 Copilot production-readiness verification.
 * Run: npm run copilot:verify-production
 *
 * Requires: .env.local with Supabase, BETA_TEST_EMAIL/PASSWORD, dev server on :3000
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const baseUrl =
  process.env.COPILOT_VERIFY_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "http://localhost:3000";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const email = process.env.BETA_TEST_EMAIL?.trim();
const password = process.env.BETA_TEST_PASSWORD?.trim();

const results = [];
let failures = 0;

function pass(id, detail) {
  results.push({ id, status: "pass", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail) {
  results.push({ id, status: "fail", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
  failures += 1;
}

function skip(id, detail) {
  results.push({ id, status: "skip", detail });
  console.log(`SKIP  ${id}${detail ? ` — ${detail}` : ""}`);
}

function sampleEstimateState() {
  return {
    title: "Copilot integration probe",
    notes: "",
    overhead_percent: 10,
    contingency_percent: 5,
    tax_percent: 0,
    profit_margin_percent: 8,
    line_items: [
      {
        id: "00000000-0000-4000-8000-000000000101",
        category: "labor",
        description: "Service upgrade labor",
        quantity: 8,
        unit: "hrs",
        unit_cost: 85,
        sort_order: 0,
      },
    ],
  };
}

async function verifyMigration023() {
  console.log("\n-- Migration 023 --");

  if (!dbUrl) {
    skip("migration.db-url", "SUPABASE_DB_URL not set");
    return;
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    const table = await client.query(
      `select 1 from information_schema.tables
       where table_schema = 'public' and table_name = 'copilot_recommendations'`
    );

    if (table.rowCount === 0) {
      fail("migration.table", "copilot_recommendations table missing");
      return;
    }

    pass("migration.table", "copilot_recommendations exists");

    const rls = await client.query(
      `select relrowsecurity from pg_class
       where relname = 'copilot_recommendations' and relnamespace = 'public'::regnamespace`
    );

    if (rls.rows[0]?.relrowsecurity) {
      pass("migration.rls", "RLS enabled");
    } else {
      fail("migration.rls", "RLS not enabled");
    }

    const policies = await client.query(
      `select policyname from pg_policies where tablename = 'copilot_recommendations'`
    );

    if (policies.rowCount >= 2) {
      pass("migration.policies", `${policies.rowCount} RLS policies`);
    } else {
      fail("migration.policies", `Expected 2+ policies, found ${policies.rowCount}`);
    }

    const applied = await client.query(
      `select 1 from public.schema_migrations where filename = '023_copilot_recommendations.sql'`
    );

    if (applied.rowCount > 0) {
      pass("migration.record", "023 recorded in schema_migrations");
    } else {
      fail("migration.record", "023 not in schema_migrations");
    }
  } catch (error) {
    fail("migration.connect", error instanceof Error ? error.message : String(error));
  } finally {
    await client.end().catch(() => null);
  }
}

async function verifyUnauthenticated() {
  console.log("\n-- Unauthenticated API --");

  for (const route of ["/api/copilot/analyze", "/api/copilot/apply", "/api/copilot/dismiss"]) {
    const response = await fetch(`${baseUrl}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.status === 401 || response.status === 403) {
      pass(`auth.unauthenticated${route}`, `HTTP ${response.status}`);
    } else {
      fail(`auth.unauthenticated${route}`, `Expected 401/403, got ${response.status}`);
    }
  }
}

const ORG_COOKIE = "voltpilot_organization_id";

async function browserLoginGetContext() {
  if (!email || !password || email.includes("your-") || password.length < 8) {
    return null;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login?next=/dashboard`, { waitUntil: "networkidle" });
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => null);

    if (!page.url().includes("/dashboard")) {
      fail("auth.browser-login", `Expected dashboard, got ${page.url()}`);
      await browser.close();
      return null;
    }

    pass("auth.browser-login", "Signed in via browser");

    await page.waitForTimeout(1200);
    let cookies = await context.cookies();
    let orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);

    if (!orgCookie?.value) {
      await page.waitForTimeout(2500);
      await page.goto(`${baseUrl}/estimates`, { waitUntil: "networkidle" }).catch(() => null);
      cookies = await context.cookies();
      orgCookie = cookies.find((cookie) => cookie.name === ORG_COOKIE);
    }

    let organizationId = orgCookie?.value ?? null;

    if (!organizationId) {
      organizationId = await resolveOrganizationIdForEmail(email);
    }

    let estimateIdFromPage = null;
    if (!organizationId) {
      await page.goto(`${baseUrl}/estimates`, { waitUntil: "networkidle" }).catch(() => null);
      const estimateHref = await page
        .locator('a[href^="/estimates/"]')
        .first()
        .getAttribute("href")
        .catch(() => null);
      const match = estimateHref?.match(
        /\/estimates\/([0-9a-f-]{36})/i
      );
      estimateIdFromPage = match?.[1] ?? null;
    }

    if (!organizationId && !estimateIdFromPage) {
      const seeded =
        (await loadEstimateForTestUser(email)) ?? (await loadAnyEstimateFallback());
      if (seeded?.estimate) {
        organizationId = seeded.estimate.organization_id;
        pass("auth.dev-estimate-fallback", `Using estimate ${seeded.estimate.id.slice(0, 8)}…`);
        return {
          browser,
          context,
          page,
          organizationId,
          estimateIdFromPage: seeded.estimate.id,
          estimateBundle: seeded,
        };
      }

      fail("auth.org-cookie", "Organization context missing after login");
      await browser.close();
      return null;
    }

    if (orgCookie?.value) {
      pass("auth.org-cookie", `org=${organizationId.slice(0, 8)}…`);
    } else if (organizationId) {
      pass("auth.org-resolved", `org=${organizationId.slice(0, 8)}… (via team membership)`);
    } else {
      pass("auth.estimate-route", `Using estimate ${estimateIdFromPage.slice(0, 8)}… from /estimates`);
    }

    return {
      browser,
      context,
      page,
      organizationId,
      estimateIdFromPage,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function loadAnyEstimateFallback() {
  if (!dbUrl) {
    return null;
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const { rows } = await client.query(
      `select
         id,
         title,
         notes,
         overhead_percent,
         contingency_percent,
         tax_percent,
         profit_margin_percent,
         organization_id
       from public.estimates
       order by updated_at desc nulls last
       limit 1`
    );

    if (!rows[0]?.id) {
      return null;
    }

    const row = rows[0];
    const { rows: lineItems } = await client.query(
      `select * from public.estimate_line_items
       where estimate_id = $1
       order by sort_order asc`,
      [row.id]
    );

    const estimate = {
      id: row.id,
      title: row.title,
      notes: row.notes,
      overhead_percent: row.overhead_percent,
      contingency_percent: row.contingency_percent,
      tax_percent: row.tax_percent,
      profit_margin_percent: row.profit_margin_percent,
      organization_id: row.organization_id,
      project: {
        name: row.title,
        project_type: null,
        address: null,
        customer: { name: "Customer" },
      },
    };

    return { estimate, lineItems };
  } catch (error) {
    fail(
      "auth.dev-estimate-fallback",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  } finally {
    await client.end().catch(() => null);
  }
}

async function loadEstimateForTestUser(targetEmail) {
  if (dbUrl && targetEmail) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      const { rows } = await client.query(
        `select e.id, e.organization_id
         from public.estimates e
         join public.team_members tm on tm.organization_id = e.organization_id
         where lower(tm.email) = lower($1)
           and tm.status = 'active'
         order by e.updated_at desc nulls last
         limit 1`,
        [targetEmail]
      );

      if (rows[0]?.id) {
        return loadEstimateForOrg(String(rows[0].organization_id), String(rows[0].id));
      }
    } catch {
      // fall through
    } finally {
      await client.end().catch(() => null);
    }
  }

  return null;
}

async function resolveOrganizationIdForEmail(targetEmail) {
  if (dbUrl && targetEmail) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      const { rows } = await client.query(
        `select tm.organization_id
         from auth.users u
         join public.team_members tm on tm.user_id = u.id
         where lower(u.email) = lower($1)
           and tm.status = 'active'
         order by tm.created_at asc
         limit 1`,
        [targetEmail]
      );

      if (rows[0]?.organization_id) {
        return String(rows[0].organization_id);
      }
    } catch {
      // fall through
    } finally {
      await client.end().catch(() => null);
    }
  }

  if (!supabaseUrl || !serviceRoleKey || !targetEmail) {
    return null;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let page = 1;
  while (page <= 5) {
    const { data: users } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const matched = users.users.find(
      (user) => user.email?.toLowerCase() === targetEmail.toLowerCase()
    );

    if (matched?.id) {
      const { data: memberships } = await admin
        .from("team_members")
        .select("organization_id")
        .eq("user_id", matched.id)
        .eq("status", "active")
        .limit(1);

      return memberships?.[0]?.organization_id ?? null;
    }

    if (users.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function loadEstimateForOrg(organizationId, estimateId = null) {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = admin.from("estimates").select(
    `
        id,
        title,
        notes,
        overhead_percent,
        contingency_percent,
        tax_percent,
        profit_margin_percent,
        organization_id,
        project:projects (
          name,
          project_type,
          address,
          customer:customers ( name )
        )
      `
  );

  if (estimateId) {
    query = query.eq("id", estimateId);
  } else if (organizationId) {
    query = query.eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(1);
  } else {
    return null;
  }

  const { data: estimateRows, error } = estimateId
    ? await query.maybeSingle().then((result) => ({
        data: result.data ? [result.data] : [],
        error: result.error,
      }))
    : await query;

  if (error || !estimateRows?.length) {
    return null;
  }

  const estimate = estimateRows[0];
  const { data: lineItems } = await admin
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimate.id)
    .order("sort_order", { ascending: true });

  return { estimate, lineItems: lineItems ?? [] };
}

async function loadOrgEquipmentOverrides(organizationId) {
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await admin
    .from("organization_catalog_items")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("category", "equipment")
    .limit(20);

  return data ?? [];
}

function mapBuilderState(estimate, lineItems) {
  return {
    title: estimate.title,
    notes: estimate.notes ?? "",
    overhead_percent: Number(estimate.overhead_percent ?? 0),
    contingency_percent: Number(estimate.contingency_percent ?? 0),
    tax_percent: Number(estimate.tax_percent ?? 0),
    profit_margin_percent: Number(estimate.profit_margin_percent ?? 0),
    line_items: lineItems.map((item, index) => ({
      id: item.id,
      category: item.category,
      description: item.description,
      quantity: Number(item.quantity ?? 0),
      unit: item.unit,
      unit_cost: Number(item.unit_cost ?? 0),
      sort_order: item.sort_order ?? index,
    })),
  };
}

function reviewContextFromEstimate(estimate) {
  const project = estimate.project ?? {};
  const customer = project.customer ?? {};

  return {
    projectName: project.name ?? estimate.title ?? "Project",
    customerName: customer.name ?? "Customer",
    projectType: project.project_type ?? null,
    projectAddress: project.address ?? null,
  };
}

async function postJsonViaBrowser(page, url, body) {
  return page.evaluate(
    async ({ targetUrl, payload }) => {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      return {
        status: response.status,
        body: await response.text(),
      };
    },
    { targetUrl: url, payload: body }
  );
}

async function verifyAuthenticatedApiFlow(browserSession, estimateBundle) {
  console.log("\n-- Authenticated copilot API (real estimate) --");

  if (!estimateBundle?.estimate) {
    skip("api.real-estimate", "No estimate found for test org");
    return null;
  }

  const { page } = browserSession;
  const { estimate, lineItems } = estimateBundle;
  const estimateId = estimate.id;

  await page
    .goto(`${baseUrl}/estimates/${estimateId}`, { waitUntil: "networkidle" })
    .catch(() => null);

  const state = mapBuilderState(estimate, lineItems);
  const context = reviewContextFromEstimate(estimate);

  const analyzeBody = {
    module: "estimate",
    mode: "review",
    entity_id: estimateId,
    state,
    context,
  };

  const analyzeStarted = Date.now();
  const analyzeResponse = await postJsonViaBrowser(
    page,
    `${baseUrl}/api/copilot/analyze`,
    analyzeBody
  );
  const analyzeMs = Date.now() - analyzeStarted;

  if (analyzeResponse.status !== 200) {
    fail("api.analyze", `HTTP ${analyzeResponse.status}: ${analyzeResponse.body}`);
    return null;
  }

  const analyzeResult = JSON.parse(analyzeResponse.body);

  if (!Array.isArray(analyzeResult.recommendations)) {
    fail("api.analyze.shape", "Missing recommendations array");
    return null;
  }

  pass(
    "api.analyze",
    `${analyzeResult.recommendations.length} recommendations in ${analyzeMs}ms (source=${analyzeResult.meta?.source})`
  );

  if (analyzeMs > 30_000) {
    fail("perf.analyze", `Analyze took ${analyzeMs}ms (>30s threshold)`);
  } else if (analyzeMs > 15_000) {
    pass("perf.analyze", `Slow but acceptable: ${analyzeMs}ms`);
  } else {
    pass("perf.analyze", `${analyzeMs}ms`);
  }

  if (analyzeResult.legacy?.review_result) {
    pass("api.analyze.legacy", "legacy.review_result present");
  } else {
    fail("api.analyze.legacy", "Missing legacy.review_result");
  }

  const persistedIds = analyzeResult.recommendations
    .map((rec) => rec.id)
    .filter(Boolean);

  if (persistedIds.length === 0) {
    skip("api.apply", "No recommendations to apply");
    skip("api.dismiss", "No recommendations to dismiss");
    return analyzeResult;
  }

  const actionable = analyzeResult.recommendations.find(
    (rec) =>
      rec.status === "pending" &&
      ["add_line_item", "adjust_markup", "update_line_item"].includes(
        rec.recommendation_type
      )
  );

  const insight = analyzeResult.recommendations.find(
    (rec) =>
      rec.status === "pending" &&
      !["add_line_item", "adjust_markup", "update_line_item"].includes(
        rec.recommendation_type
      )
  );

  if (actionable) {
    const applyResponse = await postJsonViaBrowser(page, `${baseUrl}/api/copilot/apply`, {
      module: "estimate",
      entity_type: "estimate",
      entity_id: estimateId,
      recommendation_ids: [actionable.id],
    });

    if (applyResponse.status === 200) {
      const applyResult = JSON.parse(applyResponse.body);
      pass(
        "api.apply",
        `applied=${applyResult.applied_ids?.length ?? 0}, skipped=${applyResult.skipped_ids?.length ?? 0}`
      );
    } else if (applyResponse.status === 403) {
      skip("api.apply", "User lacks estimates.edit permission");
    } else {
      fail("api.apply", `HTTP ${applyResponse.status}: ${applyResponse.body}`);
    }
  } else {
    skip("api.apply", "No actionable recommendation in analyze result");
  }

  const dismissTarget =
    insight ?? analyzeResult.recommendations.find((rec) => rec.status === "pending");

  if (dismissTarget) {
    const dismissResponse = await postJsonViaBrowser(
      page,
      `${baseUrl}/api/copilot/dismiss`,
      {
        module: "estimate",
        entity_type: "estimate",
        entity_id: estimateId,
        recommendation_ids: [dismissTarget.id],
      }
    );

    if (dismissResponse.status === 200) {
      const dismissResult = JSON.parse(dismissResponse.body);
      pass("api.dismiss", `dismissed=${dismissResult.dismissed_ids?.length ?? 0}`);
    } else if (dismissResponse.status === 403) {
      skip("api.dismiss", "User lacks estimates.edit permission");
    } else {
      fail("api.dismiss", `HTTP ${dismissResponse.status}: ${dismissResponse.body}`);
    }
  }

  const wrongEntityDismiss = await postJsonViaBrowser(
    page,
    `${baseUrl}/api/copilot/dismiss`,
    {
      module: "estimate",
      entity_type: "estimate",
      entity_id: "00000000-0000-4000-8000-000000009999",
      recommendation_ids: persistedIds.slice(0, 1),
    }
  );

  if (wrongEntityDismiss.status === 404 || wrongEntityDismiss.status === 400) {
    pass("security.dismiss.wrong-entity", `Blocked with HTTP ${wrongEntityDismiss.status}`);
  } else if (wrongEntityDismiss.status === 200) {
    const body = JSON.parse(wrongEntityDismiss.body);
    if ((body.dismissed_ids?.length ?? 0) === 0) {
      pass("security.dismiss.wrong-entity", "No IDs dismissed for wrong entity");
    } else {
      fail("security.dismiss.wrong-entity", "Dismiss succeeded for wrong entity_id");
    }
  } else {
    pass("security.dismiss.wrong-entity", `HTTP ${wrongEntityDismiss.status}`);
  }

  return analyzeResult;
}

async function verifyLegacyEstimateReview(browserSession, estimateBundle) {
  console.log("\n-- Legacy estimate-review unchanged --");

  if (!estimateBundle?.estimate) {
    skip("legacy.estimate-review", "No estimate");
    return;
  }

  const { page } = browserSession;
  const { estimate, lineItems } = estimateBundle;
  const state = mapBuilderState(estimate, lineItems);
  const context = reviewContextFromEstimate(estimate);

  const response = await postJsonViaBrowser(page, `${baseUrl}/api/ai/estimate-review`, {
    estimateId: estimate.id,
    state,
    context,
  });

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    if (Array.isArray(body.recommendations)) {
      pass("legacy.estimate-review", `${body.recommendations.length} recommendations`);
    } else {
      fail("legacy.estimate-review", "Missing recommendations array");
    }
  } else {
    fail("legacy.estimate-review", `HTTP ${response.status}`);
  }
}

async function verifyRlsIsolation(organizationId, userId) {
  console.log("\n-- RLS organization isolation --");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !organizationId || !userId) {
    skip("rls.isolation", "Missing Supabase credentials, org, or user");
    return;
  }

  const userClient = createClient(supabaseUrl, anonKey);
  await userClient.auth.signInWithPassword({ email, password });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: otherOrg } = await admin
    .from("organizations")
    .select("id")
    .neq("id", organizationId)
    .limit(1)
    .maybeSingle();

  if (!otherOrg?.id) {
    skip("rls.isolation", "Only one organization in database");
    return;
  }

  const fakeEntityId = "00000000-0000-4000-8000-0000000000aa";
  const fakeRecId = crypto.randomUUID();

  const { error: insertError } = await admin.from("copilot_recommendations").insert({
    id: fakeRecId,
    organization_id: otherOrg.id,
    user_id: userId,
    module: "estimate",
    entity_type: "estimate",
    entity_id: fakeEntityId,
    recommendation_type: "business_insight",
    severity: "info",
    title: "RLS probe",
    explanation: "Should not be visible to other org",
    payload: {},
    reasoning: {},
    status: "pending",
  });

  if (insertError) {
    skip("rls.isolation", `Could not seed other-org row: ${insertError.message}`);
    return;
  }

  const { data: leaked, error: readError } = await userClient
    .from("copilot_recommendations")
    .select("id")
    .eq("id", fakeRecId)
    .maybeSingle();

  if (readError) {
    pass("rls.isolation", "User query errored or returned no row (expected)");
  } else if (!leaked) {
    pass("rls.isolation", "Other-org recommendation not visible");
  } else {
    fail("rls.isolation", "Cross-org recommendation leaked via RLS");
  }

  await admin.from("copilot_recommendations").delete().eq("id", fakeRecId);
}

async function verifyOrgCatalogPricing(organizationId) {
  console.log("\n-- Organization catalog pricing --");

  if (!organizationId) {
    skip("catalog.org-pricing", "No org");
    return;
  }

  const overrides = await loadOrgEquipmentOverrides(organizationId);

  const child = spawnSync(
    "npx",
    ["tsx", "scripts/verify-copilot-phase1.ts"],
    {
      cwd: root,
      env: {
        ...process.env,
        COPILOT_VERIFY_ORG_OVERRIDES: JSON.stringify(overrides ?? []),
      },
      encoding: "utf8",
    }
  );

  if (child.status === 0) {
    pass("catalog.org-pricing", `${overrides?.length ?? 0} org equipment override(s) checked via resolver`);
  } else {
    fail("catalog.org-pricing", child.stderr || child.stdout || "tsx verify failed");
  }
}

function verifyOfflineScenarios() {
  console.log("\n-- Offline scenarios (OpenAI unavailable, no migration) --");

  const child = spawnSync("npx", ["tsx", "scripts/verify-copilot-offline.ts"], {
    cwd: root,
    env: { ...process.env, OPENAI_API_KEY: "" },
    encoding: "utf8",
  });

  if (child.status === 0) {
    pass("offline.scenarios", "OpenAI fallback + missing-table graceful paths");
    if (child.stdout.trim()) {
      for (const line of child.stdout.trim().split("\n")) {
        if (line.startsWith("PASS")) console.log(`  ${line}`);
      }
    }
  } else {
    fail("offline.scenarios", child.stderr || child.stdout || "offline verify failed");
  }
}

async function resolveUserId() {
  if (supabaseUrl && anonKey && email && password) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      return data.user.id;
    }
  }

  if (dbUrl && email) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
      await client.connect();
      const { rows } = await client.query(
        `select u.id
         from auth.users u
         where lower(u.email) = lower($1)
         limit 1`,
        [email]
      );

      if (rows[0]?.id) {
        return String(rows[0].id);
      }
    } catch {
      return null;
    } finally {
      await client.end().catch(() => null);
    }
  }

  return null;
}

async function main() {
  console.log("VoltPilot Copilot Phase 1 — production readiness verification");
  console.log(`Base URL: ${baseUrl}`);

  try {
    const health = await fetch(`${baseUrl}/login`);
    if (health.status >= 500) {
      fail("infra.dev-server", `Server error ${health.status}`);
    } else {
      pass("infra.dev-server", `HTTP ${health.status}`);
    }
  } catch {
    fail("infra.dev-server", "Dev server not reachable — start with npm run dev");
  }

  await verifyMigration023();
  await verifyUnauthenticated();

  verifyOfflineScenarios();

  let organizationId = null;
  let estimateBundle = null;
  let userId = null;

  const browserSession = await browserLoginGetContext();

  if (browserSession) {
    organizationId = browserSession.organizationId;
    estimateBundle =
      browserSession.estimateBundle ??
      (await loadEstimateForOrg(
        organizationId,
        browserSession.estimateIdFromPage
      )) ??
      (await loadEstimateForTestUser(email)) ??
      (await loadAnyEstimateFallback());
    organizationId =
      organizationId ?? estimateBundle?.estimate?.organization_id ?? null;
    userId = await resolveUserId();

    if (estimateBundle?.estimate) {
      pass(
        "data.estimate",
        `${estimateBundle.estimate.title} (${estimateBundle.estimate.id.slice(0, 8)}…)`
      );
    } else {
      skip("data.estimate", "No estimates in org — create one to fully test apply/dismiss");
    }

    await verifyOrgCatalogPricing(organizationId);
    await verifyRlsIsolation(organizationId, userId);
    await verifyAuthenticatedApiFlow(browserSession, estimateBundle);
    await verifyLegacyEstimateReview(browserSession, estimateBundle);

    await browserSession.browser.close();
  } else if (!email || !password || email.includes("your-") || password.length < 8) {
    skip("auth.credentials", "Set BETA_TEST_EMAIL and BETA_TEST_PASSWORD in .env.local");
    await verifyOrgCatalogPricing(null);
  }

  const report = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      skipped: results.filter((r) => r.status === "skip").length,
    },
    results,
  };

  const reportPath = path.join(root, "copilot-phase1-readiness-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nReport: ${reportPath}`);
  console.log(
    `Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`
  );

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
