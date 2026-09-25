/**
 * Internal ops: list company quote requests (newest first).
 *
 * Usage:
 *   npx tsx scripts/list-company-quotes.ts
 *   npx tsx scripts/list-company-quotes.ts --status=pending
 */

import { listCompanyQuoteRequests } from "../lib/b2b/admin-queries";

function readArg(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

async function main() {
  const status = readArg("status") as
    | "pending"
    | "reviewed"
    | "provisioned"
    | "declined"
    | null;

  const rows = await listCompanyQuoteRequests({
    status: status ?? undefined,
    limit: 50,
  });

  if (!rows.length) {
    console.log("No company quote requests found.");
    return;
  }

  for (const row of rows) {
    console.log(
      [
        row.id,
        row.status.padEnd(11),
        row.company_name,
        `quote:${row.work_email}`,
        row.ownerEmail ? `owner:${row.ownerEmail}` : "",
        row.organizationId ? `org:${row.organizationId}` : "",
        row.created_at.slice(0, 10),
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
