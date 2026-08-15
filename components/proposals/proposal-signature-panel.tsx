import { CheckCircle2, Clock3, PenLine, ShieldCheck } from "lucide-react";

import { formatDateTime } from "@/lib/proposals/format";
import type { ProposalWithRelations } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type ProposalSignaturePanelProps = {
  proposal: ProposalWithRelations;
  viewCount: number;
};

export function ProposalSignaturePanel({
  proposal,
  viewCount,
}: ProposalSignaturePanelProps) {
  const signed = Boolean(proposal.customer_signed_at && proposal.customer_signature_data);
  const statusLabel = signed
    ? "Signed"
    : proposal.status === "Accepted"
      ? "Accepted"
      : proposal.status === "Declined"
        ? "Declined"
        : "Awaiting signature";

  const auditTrail = [
    proposal.sent_at
      ? { label: "Sent to customer", timestamp: proposal.sent_at }
      : null,
    proposal.first_viewed_at
      ? { label: "First viewed", timestamp: proposal.first_viewed_at }
      : null,
    viewCount > 0
      ? { label: `${viewCount} portal view${viewCount === 1 ? "" : "s"}`, timestamp: proposal.viewed_at }
      : null,
    proposal.customer_signed_at
      ? { label: "Electronic signature captured", timestamp: proposal.customer_signed_at }
      : null,
    proposal.accepted_at
      ? { label: "Proposal accepted", timestamp: proposal.accepted_at }
      : null,
    proposal.declined_at
      ? { label: "Proposal declined", timestamp: proposal.declined_at }
      : null,
  ].filter(Boolean) as Array<{ label: string; timestamp: string | null }>;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Electronic Signatures</h2>
            <p className="text-sm text-muted-foreground">
              Customer e-sign status and audit trail
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Signature status
            </p>
            <p className="mt-1 text-sm font-semibold">{statusLabel}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              signed || proposal.status === "Accepted"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : proposal.status === "Declined"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {signed || proposal.status === "Accepted" ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <Clock3 className="size-3.5" />
            )}
            {statusLabel}
          </span>
        </div>

        {signed ? (
          <div className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PenLine className="size-4 text-primary" />
              {proposal.customer_signed_name ?? proposal.customer_signature_name ?? "Customer"}
            </div>
            {proposal.customer_signature_data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proposal.customer_signature_data}
                alt="Customer signature"
                className="max-h-24 rounded-lg border border-border bg-white p-2"
              />
            ) : null}
            <p className="text-xs text-muted-foreground">
              Signed {formatDateTime(proposal.customer_signed_at)}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Customer signature will appear here after they accept through the secure portal.
          </p>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Audit trail
          </p>
          <ul className="mt-3 space-y-2">
            {auditTrail.length === 0 ? (
              <li className="text-sm text-muted-foreground">No portal activity yet.</li>
            ) : (
              auditTrail.map((entry) => (
                <li
                  key={`${entry.label}-${entry.timestamp}`}
                  className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/30"
                >
                  <span>{entry.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.timestamp ? formatDateTime(entry.timestamp) : "—"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
