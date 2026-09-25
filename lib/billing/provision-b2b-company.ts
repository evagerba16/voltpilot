import { getCompanyQuoteRequestById } from "@/lib/b2b/admin-queries";
import type { ContractorCountRange } from "@/lib/b2b/types";
import { sendB2BOwnerWelcomeEmail } from "@/lib/email/send-b2b-owner-welcome";
import { assertValidEmail } from "@/lib/security/url-validation";

import { createAdminClient } from "@/lib/supabase/admin-cli";

import { assertOwnerEmailEligibleForB2BProvision } from "./guards/provision-eligibility";
import { resolveExistingOrganizationIdForQuoteFresh } from "./provision-b2b-idempotency";
import {
  provisionB2BOrganization,
  seatLimitFromContractorRange,
} from "./provision-b2b-org";
import { ensureOwnerAuthWithPasswordSetupLink } from "./provision-owner-auth";

export type ProvisionB2BCompanyInput = {
  quoteRequestId: string;
  ownerEmail: string;
  companyName?: string;
  seatLimit?: number;
  provisionedBy: string;
  sendWelcomeEmail?: boolean;
  dryRun?: boolean;
};

export type ProvisionB2BCompanyResult = {
  quoteRequestId: string;
  organizationId: string;
  ownerEmail: string;
  ownerUserId: string;
  seatLimit: number;
  passwordSetupUrl: string | null;
  welcomeEmailSent: boolean;
  welcomeEmailMessage: string;
  idempotent: boolean;
};

export async function provisionB2BCompanyFromQuote(
  input: ProvisionB2BCompanyInput
): Promise<ProvisionB2BCompanyResult> {
  const quote = await getCompanyQuoteRequestById(input.quoteRequestId);

  if (!quote) {
    throw new Error("Company quote request was not found.");
  }

  if (quote.status === "declined") {
    throw new Error("This quote request was declined and cannot be provisioned.");
  }

  const ownerEmail = assertValidEmail(input.ownerEmail.trim());

  if (!ownerEmail) {
    throw new Error("Enter a valid owner email address.");
  }

  const companyName = (input.companyName?.trim() || quote.company_name).trim();

  if (!companyName) {
    throw new Error("Company name is required.");
  }

  const seatLimit =
    input.seatLimit ??
    seatLimitFromContractorRange(quote.contractor_count_range as ContractorCountRange);

  if (seatLimit < 1) {
    throw new Error("Seat limit must be at least 1.");
  }

  const admin = createAdminClient();
  const existingOrganizationId = await resolveExistingOrganizationIdForQuoteFresh(
    admin,
    quote.id
  );

  if (existingOrganizationId) {
    return {
      quoteRequestId: quote.id,
      organizationId: existingOrganizationId,
      ownerEmail: quote.ownerEmail ?? ownerEmail,
      ownerUserId: "",
      seatLimit,
      passwordSetupUrl: null,
      welcomeEmailSent: false,
      welcomeEmailMessage: "Quote was already linked to an organization (idempotent).",
      idempotent: true,
    };
  }

  if (input.dryRun) {
    await assertOwnerEmailEligibleForB2BProvision(ownerEmail);

    return {
      quoteRequestId: quote.id,
      organizationId: "(dry-run)",
      ownerEmail,
      ownerUserId: "(dry-run)",
      seatLimit,
      passwordSetupUrl: null,
      welcomeEmailSent: false,
      welcomeEmailMessage: "Dry run only — no changes were made.",
      idempotent: false,
    };
  }

  await assertOwnerEmailEligibleForB2BProvision(ownerEmail);

  const ownerAuth = await ensureOwnerAuthWithPasswordSetupLink(ownerEmail);

  const { organizationId } = await provisionB2BOrganization({
    quoteRequestId: quote.id,
    ownerUserId: ownerAuth.userId,
    ownerEmail: ownerAuth.email,
    companyName,
    seatLimit,
    provisionedBy: input.provisionedBy,
    ownerEmailRecorded: ownerEmail,
  });

  let welcomeEmailSent = false;
  let welcomeEmailMessage = "Welcome email skipped.";

  if (input.sendWelcomeEmail !== false && ownerAuth.passwordSetupUrl) {
    const emailResult = await sendB2BOwnerWelcomeEmail({
      to: ownerAuth.email,
      companyName,
      passwordSetupUrl: ownerAuth.passwordSetupUrl,
    });
    welcomeEmailSent = emailResult.sent;
    welcomeEmailMessage = emailResult.message;
  } else if (!ownerAuth.passwordSetupUrl) {
    welcomeEmailMessage = "Password setup link was not generated; share a manual reset link.";
  }

  return {
    quoteRequestId: quote.id,
    organizationId,
    ownerEmail: ownerAuth.email,
    ownerUserId: ownerAuth.userId,
    seatLimit,
    passwordSetupUrl: ownerAuth.passwordSetupUrl,
    welcomeEmailSent,
    welcomeEmailMessage,
    idempotent: false,
  };
}
