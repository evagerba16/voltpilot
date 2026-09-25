/**
 * Internal ops: provision a B2B company from an approved company_quote_requests row.
 *
 * Usage:
 *   npx tsx scripts/provision-b2b-from-quote.ts --quote-id=<uuid> --owner-email=owner@company.com
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and applied migrations 024 + 028 (028 optional columns/RPC).
 */

import { provisionB2BCompanyFromQuote } from "../lib/billing/provision-b2b-company";

function readArg(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const quoteId = readArg("quote-id");
  const ownerEmail = readArg("owner-email");
  const companyName = readArg("company-name") ?? undefined;
  const seatLimitRaw = readArg("seat-limit");
  const provisionedBy =
    readArg("provisioned-by")?.trim() ||
    process.env.VOLTPILOT_OPERATOR?.trim() ||
    "voltpilot-ops";

  if (!quoteId) {
    console.error("Missing --quote-id=<uuid>");
    process.exit(1);
  }

  if (!ownerEmail) {
    console.error("Missing --owner-email=<address> (the account owner you sold the plan to)");
    process.exit(1);
  }

  const seatLimit = seatLimitRaw ? Number.parseInt(seatLimitRaw, 10) : undefined;

  if (seatLimitRaw && (!Number.isFinite(seatLimit) || seatLimit! < 1)) {
    console.error("Invalid --seat-limit (must be a positive integer)");
    process.exit(1);
  }

  const result = await provisionB2BCompanyFromQuote({
    quoteRequestId: quoteId,
    ownerEmail,
    companyName,
    seatLimit,
    provisionedBy,
    dryRun: hasFlag("dry-run"),
    sendWelcomeEmail: !hasFlag("no-email"),
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.passwordSetupUrl && !result.welcomeEmailSent && !hasFlag("dry-run")) {
    console.log("\nPassword setup link (share manually if email failed):\n");
    console.log(result.passwordSetupUrl);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
