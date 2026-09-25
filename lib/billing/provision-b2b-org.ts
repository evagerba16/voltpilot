/**
 * Manual B2B provisioning (no Stripe). Run from an internal admin script or
 * future admin UI after reviewing a company_quote_requests row.
 */
import type { ContractorCountRange } from "@/lib/b2b/types";
import {
  assertQuoteOrganizationLinkCompatible,
  claimQuoteOrganizationLink,
  fetchQuoteLinkState,
  resolveExistingOrganizationIdForQuoteFresh,
} from "@/lib/billing/provision-b2b-idempotency";
import { createAdminClient } from "@/lib/supabase/admin-cli";

export type ProvisionB2BOrganizationInput = {
  quoteRequestId: string;
  ownerUserId: string;
  ownerEmail: string;
  companyName: string;
  seatLimit: number;
  provisionedBy: string;
  ownerEmailRecorded: string;
};

function seatLimitFromContractorRange(range: ContractorCountRange): number {
  switch (range) {
    case "1-5":
      return 5;
    case "6-15":
      return 15;
    case "16-30":
      return 30;
    case "31-50":
      return 50;
    case "51+":
      return 100;
    default:
      return 10;
  }
}

export { seatLimitFromContractorRange };

export async function provisionB2BOrganization(input: ProvisionB2BOrganizationInput) {
  const admin = createAdminClient();

  let organizationId = await resolveExistingOrganizationIdForQuoteFresh(
    admin,
    input.quoteRequestId
  );

  if (!organizationId) {
    organizationId = await resolveExistingOrganizationIdForQuoteFresh(
      admin,
      input.quoteRequestId
    );
  }

  if (!organizationId) {
    const { data: bootstrappedOrgId, error: orgError } = await admin.rpc(
      "bootstrap_b2b_owner_organization",
      {
        p_user_id: input.ownerUserId,
        p_email: input.ownerEmail,
        p_company_name: input.companyName,
      }
    );

    if (orgError || !bootstrappedOrgId) {
      throw new Error(orgError?.message ?? "Unable to create organization.");
    }

    const bootstrappedId = bootstrappedOrgId as string;
    const quoteAfterBootstrap = await fetchQuoteLinkState(admin, input.quoteRequestId);

    if (quoteAfterBootstrap.organizationId) {
      assertQuoteOrganizationLinkCompatible(
        quoteAfterBootstrap.organizationId,
        bootstrappedId
      );
      organizationId = quoteAfterBootstrap.organizationId;
    } else {
      organizationId = await claimQuoteOrganizationLink(
        admin,
        input.quoteRequestId,
        bootstrappedId
      );
    }
  }

  await finalizeProvisionedQuote(admin, input, organizationId);

  return { organizationId };
}

async function finalizeProvisionedQuote(
  admin: ReturnType<typeof createAdminClient>,
  input: ProvisionB2BOrganizationInput,
  organizationId: string
) {
  const { error: entitlementError } = await admin.from("organization_entitlements").upsert(
    {
      organization_id: organizationId,
      seat_limit: input.seatLimit,
      plan_type: "b2b",
      billing_source: "manual",
      company_quote_request_id: input.quoteRequestId,
      project_visibility_mode: "assigned",
    },
    { onConflict: "organization_id" }
  );

  if (entitlementError) {
    if (entitlementError.code === "23505") {
      const recovered = await resolveExistingOrganizationIdForQuoteFresh(
        admin,
        input.quoteRequestId
      );

      if (recovered === organizationId) {
        return;
      }

      if (recovered) {
        throw new Error(
          `Quote is already linked to organization ${recovered}. Organization ${organizationId} may be an orphan and needs manual review.`
        );
      }
    }

    throw new Error(entitlementError.message);
  }

  const { error: subscriptionError } = await admin.from("organization_subscriptions").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: `manual_${organizationId}`,
      status: "active",
    },
    { onConflict: "organization_id" }
  );

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const provisionedAt = new Date().toISOString();

  const quoteBeforeFinalize = await fetchQuoteLinkState(admin, input.quoteRequestId);
  assertQuoteOrganizationLinkCompatible(
    quoteBeforeFinalize.organizationId,
    organizationId
  );

  const { error: quoteError } = await admin
    .from("company_quote_requests")
    .update({
      status: "provisioned",
      organization_id: organizationId,
      owner_email: input.ownerEmailRecorded.trim().toLowerCase(),
      provisioned_at: provisionedAt,
      provisioned_by: input.provisionedBy,
      updated_at: provisionedAt,
    })
    .eq("id", input.quoteRequestId)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`);

  if (quoteError) {
    throw new Error(quoteError.message);
  }
}
