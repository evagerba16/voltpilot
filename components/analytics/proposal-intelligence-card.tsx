"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileText, Send, Sparkles } from "lucide-react";

import { ForecastMetric } from "@/components/analytics/forecast-metric";
import type { ProposalIntelligenceResult } from "@/lib/analytics/analytics-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

type ProposalIntelligenceCardProps = {
  intelligence: ProposalIntelligenceResult;
};

function PercentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: { acceptanceRate: number; decidedCount: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {formatPercent(point.acceptanceRate)} · {point.decidedCount} decided
      </p>
    </div>
  );
}

function formatDays(value: number) {
  if (value <= 0) {
    return "—";
  }

  return `${value.toFixed(1)}d`;
}

export function ProposalIntelligenceCard({
  intelligence,
}: ProposalIntelligenceCardProps) {
  const priorityFollowUps = intelligence.openProposalsAwaitingFollowUp.filter(
    (proposal) => proposal.needsFollowUp
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Proposal Intelligence</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Workflow timing, revision patterns, and follow-up opportunities.
            </p>
          </div>
        </div>
        {intelligence.source === "rules" ? (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Standard recommendations
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <ForecastMetric
          label="Avg time to send"
          value={formatDays(intelligence.averageTimeToSendDays)}
          hint={`${intelligence.sentProposalCount} sent proposal${intelligence.sentProposalCount === 1 ? "" : "s"}`}
        />
        <ForecastMetric
          label="Avg time to acceptance"
          value={formatDays(intelligence.averageTimeToAcceptanceDays)}
          hint={`${intelligence.acceptedProposalCount} accepted proposal${intelligence.acceptedProposalCount === 1 ? "" : "s"}`}
          tone="positive"
        />
        <ForecastMetric
          label="Avg revisions"
          value={intelligence.averageRevisionCount.toFixed(1)}
          hint="Saved proposal versions per proposal"
        />
        <ForecastMetric
          label="Awaiting follow-up"
          value={String(intelligence.openFollowUpCount)}
          hint={
            priorityFollowUps > 0
              ? `${priorityFollowUps} open for 7+ days since sent`
              : "Sent or viewed proposals still open"
          }
          tone={priorityFollowUps > 0 ? "warning" : "default"}
        />
      </div>

      <div className="border-t border-border px-6 py-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Acceptance rate by month</h3>
          <p className="text-sm text-muted-foreground">
            Win rate on proposals decided in each period.
          </p>
        </div>
        {intelligence.acceptanceRateByMonth.some((point) => point.decidedCount > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intelligence.acceptanceRateByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<PercentTooltip />} />
                <Bar dataKey="acceptanceRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No decided proposals in this period to chart monthly acceptance.
          </p>
        )}
      </div>

      <div className="border-t border-border">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold">Open proposals awaiting follow-up</h3>
          <p className="text-sm text-muted-foreground">
            Sent and viewed proposals that still need a customer decision.
          </p>
        </div>
        {intelligence.openProposalsAwaitingFollowUp.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No open sent or viewed proposals in the current filters.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {intelligence.openProposalsAwaitingFollowUp.slice(0, 8).map((proposal) => (
              <Link
                key={proposal.id}
                href={proposal.href}
                className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{proposal.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        proposal.needsFollowUp
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {proposal.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {proposal.projectName} · {proposal.customerName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  <span className="font-medium tabular-nums">
                    {formatCurrency(proposal.amount)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Send className="size-3.5" />
                    {proposal.daysSinceSent.toFixed(0)}d since sent
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {intelligence.openProposalsAwaitingFollowUp.length > 8 ? (
          <div className="border-t border-border px-6 py-3">
            <Link
              href="/proposals?status=Sent"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="size-4" />
              View all open proposals
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
