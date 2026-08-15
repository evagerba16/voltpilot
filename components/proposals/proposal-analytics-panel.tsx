import {
  BarChart3,
  Clock3,
  Eye,
  HandCoins,
  TrendingUp,
} from "lucide-react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency } from "@/lib/proposals/format";
import type { ProposalDetailAnalytics, ProposalOrgAnalytics } from "@/lib/proposals/profile-types";

type ProposalAnalyticsPanelProps = {
  detail?: ProposalDetailAnalytics;
  org?: ProposalOrgAnalytics;
  variant?: "detail" | "list";
};

function formatPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

export function ProposalAnalyticsPanel({
  detail,
  org,
  variant = "detail",
}: ProposalAnalyticsPanelProps) {
  if (variant === "list" && org) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Proposal Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Performance across your proposal pipeline
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardKpiCard
            title="Open Rate"
            value={formatPercent(org.openRate)}
            change="Sent proposals opened"
            icon={Eye}
          />
          <DashboardKpiCard
            title="Acceptance Rate"
            value={formatPercent(org.acceptanceRate)}
            change="Won vs decided"
            changeType={org.acceptanceRate >= 50 ? "positive" : "neutral"}
            icon={TrendingUp}
          />
          <DashboardKpiCard
            title="Avg Response"
            value={org.avgResponseDays > 0 ? `${org.avgResponseDays.toFixed(1)}d` : "—"}
            change="Send to acceptance"
            icon={Clock3}
          />
          <DashboardKpiCard
            title="Avg Proposal Value"
            value={formatCurrency(org.avgProposalValue)}
            change="Across all proposals"
            icon={HandCoins}
          />
          <DashboardKpiCard
            title="Top Win Type"
            value={org.topProjectType ?? "—"}
            change={`${org.followUpCount} need follow-up`}
            changeType={org.followUpCount > 0 ? "negative" : "neutral"}
            icon={BarChart3}
          />
        </div>
      </section>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Proposal Analytics</h2>
        <p className="text-sm text-muted-foreground">Engagement and revision metrics</p>
      </div>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Portal views" value={String(detail.viewCount)} />
        <Metric label="Emails sent" value={String(detail.emailCount)} />
        <Metric label="Revisions" value={String(detail.revisionCount)} />
        <Metric
          label="Days since sent"
          value={detail.daysSinceSent !== null ? String(detail.daysSinceSent) : "—"}
        />
        <Metric
          label="Days to decision"
          value={detail.daysToDecision !== null ? String(detail.daysToDecision) : "—"}
        />
        <Metric label="Open status" value={detail.openRateLabel} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
