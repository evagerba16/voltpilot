import Link from "next/link";
import { ArrowRight, CircleDollarSign, FileText, Send } from "lucide-react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency } from "@/lib/proposals/format";
import type { ProposalOrgAnalytics } from "@/lib/proposals/profile-types";

type ProposalsStatsProps = {
  draft: number;
  sent: number;
  won: number;
  pipeline: number;
  orgAnalytics: ProposalOrgAnalytics;
  compact?: boolean;
};

export function ProposalsStats({
  draft,
  sent,
  won,
  pipeline,
  orgAnalytics,
  compact = false,
}: ProposalsStatsProps) {
  if (compact) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Pipeline snapshot</h2>
          <Link
            href="/analytics?section=proposals"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View analytics
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardKpiCard
            title="Ready to send"
            value={String(draft)}
            change="Draft proposals"
            icon={FileText}
            href="/proposals?status=Draft"
          />
          <DashboardKpiCard
            title="Awaiting response"
            value={String(sent)}
            change={`${orgAnalytics.openRate.toFixed(0)}% open rate`}
            icon={Send}
            href="/proposals?status=Sent"
          />
          <DashboardKpiCard
            title="Open pipeline"
            value={formatCurrency(pipeline)}
            change={`${won} accepted · ${orgAnalytics.followUpCount} need follow-up`}
            icon={CircleDollarSign}
            highlight
          />
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardKpiCard
        title="In Progress"
        value={String(draft)}
        change="Draft proposals"
        icon={FileText}
      />
      <DashboardKpiCard
        title="Sent or Viewed"
        value={String(sent)}
        change={`${orgAnalytics.openRate.toFixed(0)}% open rate`}
        icon={Send}
      />
      <DashboardKpiCard
        title="Accepted"
        value={String(won)}
        change={`${orgAnalytics.acceptanceRate.toFixed(0)}% win rate`}
        changeType={orgAnalytics.acceptanceRate >= 50 ? "positive" : "neutral"}
        icon={Send}
      />
      <DashboardKpiCard
        title="Open Pipeline"
        value={formatCurrency(pipeline)}
        change={`${orgAnalytics.followUpCount} need follow-up`}
        changeType={orgAnalytics.followUpCount > 0 ? "negative" : "neutral"}
        icon={CircleDollarSign}
        highlight
      />
    </div>
  );
}
