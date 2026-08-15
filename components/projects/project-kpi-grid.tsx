import {
  CalendarClock,
  CircleDollarSign,
  Percent,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency, formatPercent } from "@/lib/projects/format";
import type { ProjectKpiSummary } from "@/lib/projects/profile-types";
import { cn } from "@/lib/utils";

type ProjectKpiGridProps = {
  kpis: ProjectKpiSummary;
  compact?: boolean;
};

export function ProjectKpiGrid({ kpis, compact = false }: ProjectKpiGridProps) {
  const cards = [
    <DashboardKpiCard
      key="contract-value"
      title="Contract Value"
      value={formatCurrency(kpis.contractValue)}
      change="Estimated contract amount"
      icon={CircleDollarSign}
      highlight={!compact}
    />,
    <DashboardKpiCard
      key="estimated-profit"
      title="Estimated Profit"
      value={formatCurrency(kpis.estimatedProfit)}
      change={kpis.estimatedProfit > 0 ? "From primary estimate" : "Add estimate pricing"}
      changeType={kpis.estimatedProfit > 0 ? "positive" : "neutral"}
      icon={Wallet}
    />,
    <DashboardKpiCard
      key="gross-margin"
      title="Gross Margin"
      value={formatPercent(kpis.grossMarginPercent)}
      change={
        kpis.grossMarginPercent >= 20
          ? "Healthy margin target"
          : kpis.grossMarginPercent > 0
            ? "Review markup"
            : "Not calculated yet"
      }
      changeType={
        kpis.grossMarginPercent >= 20
          ? "positive"
          : kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 12
            ? "negative"
            : "neutral"
      }
      icon={Percent}
    />,
    <DashboardKpiCard
      key="progress"
      title="Progress"
      value={`${kpis.progressPercent.toFixed(0)}%`}
      change="Pipeline to field execution"
      icon={Target}
    />,
    <DashboardKpiCard
      key="budget-used"
      title="Budget Used"
      value={`${kpis.budgetUsedPercent.toFixed(0)}%`}
      change={
        kpis.budgetUsedPercent > 100
          ? "Over budget"
          : kpis.budgetUsedPercent > 0
            ? "Actual vs estimated cost"
            : "No actuals recorded"
      }
      changeType={
        kpis.budgetUsedPercent > 100
          ? "negative"
          : kpis.budgetUsedPercent > 0
            ? "neutral"
            : "neutral"
      }
      icon={TrendingUp}
    />,
    <DashboardKpiCard
      key="days-remaining"
      title="Days Remaining"
      value={
        kpis.daysRemaining !== null && kpis.daysRemaining >= 0
          ? String(kpis.daysRemaining)
          : kpis.daysRemainingLabel === "—"
            ? "—"
            : kpis.daysRemainingLabel
      }
      change={kpis.daysRemainingLabel}
      changeType={
        kpis.daysRemaining !== null && kpis.daysRemaining < 0
          ? "negative"
          : kpis.daysRemaining !== null && kpis.daysRemaining <= 7
            ? "negative"
            : "neutral"
      }
      icon={CalendarClock}
    />,
  ];

  const visibleCards = compact ? cards.slice(0, 3) : cards;

  return (
    <div
      className={cn(
        "grid gap-4",
        compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      )}
    >
      {visibleCards}
    </div>
  );
}
