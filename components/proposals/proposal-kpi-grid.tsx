import {
  Calendar,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Percent,
  Wallet,
} from "lucide-react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency, formatProposalDate, formatProposalStatus } from "@/lib/proposals/format";
import type { ProposalKpiSummary } from "@/lib/proposals/profile-types";

type ProposalKpiGridProps = {
  kpis: ProposalKpiSummary;
};

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

export function ProposalKpiGrid({ kpis }: ProposalKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <DashboardKpiCard
        title="Proposal Value"
        value={formatCurrency(kpis.proposalValue)}
        change="Total bid amount"
        icon={CircleDollarSign}
        highlight
      />
      <DashboardKpiCard
        title="Estimated Profit"
        value={formatCurrency(kpis.estimatedProfit)}
        change={kpis.estimatedProfit > 0 ? "From linked estimate" : "Add estimate pricing"}
        changeType={kpis.estimatedProfit > 0 ? "positive" : "neutral"}
        icon={Wallet}
      />
      <DashboardKpiCard
        title="Gross Margin"
        value={formatPercent(kpis.grossMarginPercent)}
        change={
          kpis.grossMarginPercent >= 20
            ? "Healthy margin"
            : kpis.grossMarginPercent > 0
              ? "Review markup"
              : "Not calculated"
        }
        changeType={
          kpis.grossMarginPercent >= 20
            ? "positive"
            : kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 12
              ? "negative"
              : "neutral"
        }
        icon={Percent}
      />
      <DashboardKpiCard
        title="Status"
        value={formatProposalStatus(kpis.status)}
        change="Current workflow stage"
        icon={FileText}
      />
      <DashboardKpiCard
        title="Created Date"
        value={formatProposalDate(kpis.createdDate)}
        change="Proposal created"
        icon={Calendar}
      />
      <DashboardKpiCard
        title="Expiration Date"
        value={formatProposalDate(kpis.expirationDate)}
        change={kpis.expirationDate ? "Valid through" : "No expiration set"}
        icon={CalendarClock}
      />
    </div>
  );
}
