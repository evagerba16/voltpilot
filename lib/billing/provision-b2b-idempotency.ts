import type { SupabaseClient } from "@supabase/supabase-js";

type QuoteLinkRow = {
  organizationId: string | null;
  status: string;
};

export async function fetchQuoteLinkState(
  admin: SupabaseClient,
  quoteRequestId: string
): Promise<QuoteLinkRow> {
  const { data, error } = await admin
    .from("company_quote_requests")
    .select("organization_id, status")
    .eq("id", quoteRequestId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    organizationId: data.organization_id as string | null,
    status: data.status as string,
  };
}

async function loadEntitlementOrganizationIdsForQuote(
  admin: SupabaseClient,
  quoteRequestId: string
): Promise<string[]> {
  const { data: entitlements, error: entError } = await admin
    .from("organization_entitlements")
    .select("organization_id")
    .eq("company_quote_request_id", quoteRequestId);

  if (entError) {
    if (entError.message.includes("company_quote_request_id")) {
      return [];
    }

    throw new Error(entError.message);
  }

  return (entitlements ?? [])
    .map((row) => row.organization_id as string | null)
    .filter((organizationId): organizationId is string => Boolean(organizationId));
}

function assertSingleLinkedOrganization(
  organizationIds: string[],
  context: string
): string | null {
  if (organizationIds.length > 1) {
    throw new Error(
      `Multiple organizations are linked to this quote (${context}). Resolve duplicate entitlement rows before re-running.`
    );
  }

  return organizationIds[0] ?? null;
}

/** Throws if the quote row is already tied to a different organization. */
export function assertQuoteOrganizationLinkCompatible(
  quoteOrganizationId: string | null,
  expectedOrganizationId: string
) {
  if (quoteOrganizationId && quoteOrganizationId !== expectedOrganizationId) {
    throw new Error(
      `Quote is already linked to organization ${quoteOrganizationId}. Organization ${expectedOrganizationId} may be an orphan and needs manual review.`
    );
  }
}

async function backfillQuoteOrganizationLink(
  admin: SupabaseClient,
  quoteRequestId: string,
  organizationId: string
) {
  const { error } = await admin
    .from("company_quote_requests")
    .update({
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteRequestId)
    .is("organization_id", null);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Resolve an org already tied to this quote (quote row or entitlements).
 * Prevents a second bootstrap when a prior run partially succeeded.
 */
export async function resolveExistingOrganizationIdForQuote(
  admin: SupabaseClient,
  quoteRequestId: string,
  quote: QuoteLinkRow
): Promise<string | null> {
  const entitlementOrgIds = await loadEntitlementOrganizationIdsForQuote(
    admin,
    quoteRequestId
  );
  const entitlementOrgId = assertSingleLinkedOrganization(
    entitlementOrgIds,
    "entitlements"
  );

  if (quote.organizationId) {
    if (entitlementOrgId && entitlementOrgId !== quote.organizationId) {
      throw new Error(
        `Quote organization_id (${quote.organizationId}) conflicts with entitlement organization_id (${entitlementOrgId}). Fix data before re-running.`
      );
    }

    return quote.organizationId;
  }

  if (entitlementOrgId) {
    await backfillQuoteOrganizationLink(admin, quoteRequestId, entitlementOrgId);
    return entitlementOrgId;
  }

  if (quote.status === "provisioned") {
    throw new Error(
      "Quote is marked provisioned but no organization is linked. Fix the quote row in Supabase before re-running."
    );
  }

  return null;
}

/**
 * Fresh read + resolve. Call immediately before bootstrap so a linked quote never spawns a second org.
 */
export async function resolveExistingOrganizationIdForQuoteFresh(
  admin: SupabaseClient,
  quoteRequestId: string
): Promise<string | null> {
  const quote = await fetchQuoteLinkState(admin, quoteRequestId);
  return resolveExistingOrganizationIdForQuote(admin, quoteRequestId, quote);
}

/** Claim quote → org immediately after bootstrap so retries never call bootstrap again. */
export async function claimQuoteOrganizationLink(
  admin: SupabaseClient,
  quoteRequestId: string,
  organizationId: string
): Promise<string> {
  const { data: claimed, error: claimError } = await admin
    .from("company_quote_requests")
    .update({
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteRequestId)
    .is("organization_id", null)
    .select("organization_id")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (claimed?.organization_id) {
    return claimed.organization_id as string;
  }

  const { data: quoteRow, error: fetchError } = await admin
    .from("company_quote_requests")
    .select("organization_id")
    .eq("id", quoteRequestId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const linkedOrgId = quoteRow.organization_id as string | null;

  if (!linkedOrgId) {
    throw new Error("Unable to link organization to quote request.");
  }

  assertQuoteOrganizationLinkCompatible(linkedOrgId, organizationId);

  return linkedOrgId;
}
