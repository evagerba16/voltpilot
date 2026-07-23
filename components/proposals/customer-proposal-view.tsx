"use client";

import { useState, useTransition } from "react";
import { Check, Download, MessageSquare, Send, ShieldCheck, X } from "lucide-react";

import {
  commentOnCustomerProposal,
  respondToCustomerProposal,
} from "@/app/p/[token]/actions";
import { PortalProposalPreview } from "@/components/proposals/proposal-preview";
import { SignaturePad } from "@/components/proposals/signature-pad";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatProposalDate } from "@/lib/proposals/format";
import {
  CUSTOMER_PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_STYLES,
  type ProposalPortalData,
} from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type CustomerProposalViewProps = {
  token: string;
  initialProposal: ProposalPortalData;
};

export function CustomerProposalView({
  token,
  initialProposal,
}: CustomerProposalViewProps) {
  const [proposal, setProposal] = useState(initialProposal);
  const [signerName, setSignerName] = useState(
    initialProposal.customer_signature_name ?? initialProposal.customer.contact_name
  );
  const [comment, setComment] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [commentPending, startCommentTransition] = useTransition();

  const company = proposal.company_snapshot ?? {
    company_name: "Your Company",
    company_logo_url: null,
    address_lines: [],
    phone: null,
    email: null,
    website: null,
    license_number: null,
  };

  const canRespond = ["Sent", "Viewed"].includes(proposal.status);
  const statusLabel = CUSTOMER_PROPOSAL_STATUS_LABELS[proposal.status];

  async function refreshProposal() {
    const refreshed = await fetch(`/api/proposals/portal/${token}`)
      .then((response) => response.json())
      .catch(() => null);

    if (refreshed?.proposal) {
      setProposal(refreshed.proposal as ProposalPortalData);
    }
  }

  function handleResponse(action: "accept" | "decline") {
    setError(null);
    setCommentMessage(null);

    if (action === "accept" && !signatureData) {
      setError("Add your signature before accepting this proposal.");
      return;
    }

    startTransition(async () => {
      const result = await respondToCustomerProposal({
        token,
        action,
        signerName,
        signatureData: action === "accept" ? signatureData ?? undefined : undefined,
        comment,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      await refreshProposal();
    });
  }

  function handleCommentOnly() {
    setError(null);
    setCommentMessage(null);

    if (!comment.trim()) {
      setError("Enter a comment before sending.");
      return;
    }

    startCommentTransition(async () => {
      const result = await commentOnCustomerProposal({
        token,
        authorName: signerName,
        comment,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setComment("");
      setCommentMessage("Your comment was sent to the contractor.");
      await refreshProposal();
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(241,245,249,1)_100%)]">
      <header className="border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {company.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.company_logo_url}
                alt={`${company.company_name} logo`}
                className="h-12 w-auto max-w-[160px] object-contain"
              />
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {company.company_name}
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">{proposal.title}</h1>
              <p className="text-sm text-muted-foreground">
                {proposal.proposal_number} · {formatCurrency(proposal.amount)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                PROPOSAL_STATUS_STYLES[proposal.status]
              )}
            >
              {statusLabel}
            </span>
            <a href={`/p/${token}/pdf`} className="inline-flex">
              <Button variant="outline">
                <Download data-icon="inline-start" />
                Download PDF
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-28 lg:pb-8">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{proposal.project.project_name}</p>
              <p className="text-sm text-muted-foreground">
                Prepared for {proposal.customer.contact_name} ·{" "}
                {proposal.customer.company_name}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Created {formatProposalDate(proposal.proposal_date)}</span>
              {proposal.expiration_date ? (
                <span>Expires {formatProposalDate(proposal.expiration_date)}</span>
              ) : null}
            </div>
          </div>
        </section>

        <PortalProposalPreview portal={proposal} />

        {proposal.comments.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="size-4" />
              Comments
            </h2>
            <div className="space-y-3">
              {proposal.comments.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-muted/20 px-4 py-3 text-sm">
                  <p className="font-medium">{entry.author_name}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{entry.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatProposalDate(entry.created_at.slice(0, 10))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {proposal.status === "Draft" ? (
          <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground sm:p-6">
            This proposal has not been sent yet. Contact your contractor if you
            believe you received this link in error.
          </section>
        ) : null}

        {canRespond ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Review and respond</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the proposal above, ask questions if you need to, then accept with
                  your signature or reject the proposal.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="customer-name">
                  Your name
                </label>
                <input
                  id="customer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="customer-comment">
                  Questions or comments
                </label>
                <textarea
                  id="customer-comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ask about scope, schedule, alternates, or exclusions before accepting."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Electronic signature</label>
                <p className="text-xs text-muted-foreground">
                  Required to accept this proposal.
                </p>
                <SignaturePad onChange={setSignatureData} />
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {commentMessage ? (
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {commentMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => handleResponse("accept")} disabled={pending}>
                <Check data-icon="inline-start" />
                {pending ? "Submitting..." : "Accept proposal"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResponse("decline")}
                disabled={pending}
              >
                <X data-icon="inline-start" />
                Reject proposal
              </Button>
              <Button
                variant="secondary"
                onClick={handleCommentOnly}
                disabled={commentPending || !comment.trim()}
              >
                <Send data-icon="inline-start" />
                {commentPending ? "Sending..." : "Send comment only"}
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5 text-sm shadow-sm sm:p-6">
            <p className="font-medium">This proposal is no longer open for changes.</p>
            <p className="text-muted-foreground">
              Status: {statusLabel}
              {proposal.customer_signed_at
                ? ` · Signed ${formatProposalDate(proposal.customer_signed_at.slice(0, 10))}`
                : ""}
            </p>
            {proposal.customer_signature_data ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proposal.customer_signature_data}
                alt="Customer signature"
                className="mt-4 h-16 object-contain"
              />
            ) : null}
          </section>
        )}
      </main>

      {canRespond ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            <Button
              className="flex-1"
              onClick={() => handleResponse("accept")}
              disabled={pending}
            >
              Accept
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => handleResponse("decline")}
              disabled={pending}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
