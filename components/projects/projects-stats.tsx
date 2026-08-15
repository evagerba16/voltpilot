import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Award,
  Briefcase,
  CircleDollarSign,
  FileText,
} from "lucide-react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency } from "@/lib/projects/format";

type ProjectsStatsProps = {
  activeProjects: number;
  estimatingProjects: number;
  proposalsSent: number;
  awardedProjects: number;
  estimatedRevenue: number;
  averageMargin: number;
  compact?: boolean;
};

export function ProjectsStats({
  activeProjects,
  estimatingProjects,
  proposalsSent,
  awardedProjects,
  estimatedRevenue,
  averageMargin,
  compact = false,
}: ProjectsStatsProps) {
  if (compact) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Pipeline snapshot</h2>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View Analytics
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardKpiCard
            title="Active projects"
            value={String(activeProjects)}
            change={`${estimatingProjects} estimating`}
            icon={Briefcase}
            href="/projects?view=active"
          />
          <DashboardKpiCard
            title="Proposals out"
            value={String(proposalsSent)}
            change={`${awardedProjects} awarded`}
            icon={FileText}
            href="/projects?status=Proposal Sent"
          />
          <DashboardKpiCard
            title="Pipeline value"
            value={formatCurrency(estimatedRevenue)}
            change={
              averageMargin > 0
                ? `${averageMargin.toFixed(1)}% avg margin`
                : "Estimated contract value"
            }
            icon={CircleDollarSign}
            href="/analytics?section=projects"
          />
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <DashboardKpiCard
        title="Active Projects"
        value={String(activeProjects)}
        change="Open jobs in pipeline"
        icon={Briefcase}
        highlight
        href="/projects?view=active"
      />
      <DashboardKpiCard
        title="Estimating"
        value={String(estimatingProjects)}
        change="Bids in progress"
        icon={FileText}
        href="/projects?status=Estimating"
      />
      <DashboardKpiCard
        title="Proposals Sent"
        value={String(proposalsSent)}
        change="Awaiting customer decision"
        icon={Award}
        href="/projects?status=Proposal Sent"
      />
      <DashboardKpiCard
        title="Awarded"
        value={String(awardedProjects)}
        change="Ready to mobilize"
        changeType={awardedProjects > 0 ? "positive" : "neutral"}
        icon={Award}
        href="/projects?status=Awarded"
      />
      <DashboardKpiCard
        title="Pipeline Value"
        value={formatCurrency(estimatedRevenue)}
        change="Estimated contract value"
        icon={CircleDollarSign}
        href="/analytics?section=projects"
      />
      <DashboardKpiCard
        title="Avg. Margin"
        value={`${averageMargin.toFixed(1)}%`}
        change={averageMargin > 0 ? "Across saved estimates" : "Add estimate markup"}
        changeType={averageMargin >= 18 ? "positive" : "neutral"}
        icon={CircleDollarSign}
        href="/analytics?section=estimating"
      />
    </div>
  );
}
