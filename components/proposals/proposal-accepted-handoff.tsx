"use client";

import Link from "next/link";
import { Circle, HardHat, Sparkles, Trophy } from "lucide-react";

import { formatCurrency, formatShortDate } from "@/lib/proposals/format";
import type { AcceptanceNextStep } from "@/lib/proposals/acceptance-next-steps";

type ProposalAcceptedHandoffProps = {
  customerName: string;
  contactName: string;
  projectName: string;
  projectType: string;
  projectAddress: string | null;
  amount: number;
  grossMarginPercent: number | null;
  acceptedAt: string | null;
  signerName: string | null;
  nextSteps: AcceptanceNextStep[];
};

export function ProposalAcceptedHandoff({
  customerName,
  contactName,
  projectName,
  projectType,
  projectAddress,
  amount,
  grossMarginPercent,
  acceptedAt,
  signerName,
  nextSteps,
}: ProposalAcceptedHandoffProps) {
  const signedLabel = signerName
    ? `Signed by ${signerName}`
    : "Customer signed electronically";

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-card shadow-sm">
      <div className="border-b border-emerald-500/15 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              <Trophy className="size-3.5" />
              Project awarded
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                You won {projectName}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {customerName} accepted your proposal. This job is now active — the work phase
                begins with job costing, field logs, and change order tracking.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-emerald-500/20 bg-card/80 px-5 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contract value
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
              {formatCurrency(amount)}
            </p>
            {grossMarginPercent !== null && grossMarginPercent > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {grossMarginPercent.toFixed(1)}% gross margin
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What you won
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="text-right font-medium">{customerName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="text-right font-medium">{contactName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Project type</dt>
              <dd className="text-right font-medium">{projectType}</dd>
            </div>
            {projectAddress ? (
              <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="max-w-[60%] text-right font-medium">{projectAddress}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Accepted</dt>
              <dd className="text-right font-medium">
                {acceptedAt ? formatShortDate(acceptedAt) : "Recently"}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {signedLabel}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HardHat className="size-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Next phase: run the job
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Move from selling to executing. Track actual costs against your bid, log daily field
            work, and manage change orders — then review performance in analytics when the job
            wraps up.
          </p>
        </div>
      </div>

      {nextSteps.length > 0 ? (
        <div className="border-t border-border/60 bg-muted/10 px-6 py-5 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">Recommended next steps</h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {nextSteps.map((step) => (
              <li
                key={step.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                <div className="min-w-0">
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {step.label}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{step.label}</p>
                  )}
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
