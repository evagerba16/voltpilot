import { formatCurrency, formatProposalDate } from "@/lib/proposals/format";
import type { ProposalPortalData } from "@/lib/proposals/types";

type ProposalExpiredViewProps = {
  proposal: ProposalPortalData;
  token: string;
};

export function ProposalExpiredView({ proposal, token }: ProposalExpiredViewProps) {
  const company = proposal.company_snapshot;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-8 text-center">
          {company?.company_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.company_logo_url}
              alt={`${company.company_name} logo`}
              className="mx-auto h-12 max-w-[180px] object-contain"
            />
          ) : null}
          <p className="text-sm font-medium text-muted-foreground">
            {company?.company_name ?? "Proposal"}
          </p>
          <h1 className="text-2xl font-bold">This proposal has expired</h1>
          <p className="text-sm text-muted-foreground">
            {proposal.proposal_number} · {proposal.title}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Valid through{" "}
            {proposal.expiration_date ?
              formatProposalDate(proposal.expiration_date)
            : "the original expiration date"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This {formatCurrency(proposal.amount)} proposal is no longer open for
            acceptance. Contact {company?.company_name ?? "the contractor"} to
            request an updated bid.
          </p>
          <a
            href={`/p/${token}/pdf`}
            className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Download PDF copy
          </a>
        </div>
      </main>
    </div>
  );
}
