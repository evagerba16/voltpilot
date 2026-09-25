"use client";

import Link from "next/link";
import {
  BarChart3,
  FileText,
  FolderKanban,
  PencilLine,
  Send,
  Users,
} from "lucide-react";

import { RevenueForecastCard } from "@/components/analytics/revenue-forecast-card";
import { AnalyticsKpiCard } from "@/components/analytics/analytics-kpi-card";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatCurrency } from "@/lib/analytics/format";
import type { CompanyDashboardOverview } from "@/lib/dashboard/company-overview";
import { vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type CompanyDashboardProps = {
  overview: CompanyDashboardOverview;
  displayName: string;
};

function formatCount(value: number | null, unavailableLabel = "Unavailable") {
  if (value === null) {
    return unavailableLabel;
  }

  return String(value);
}

export function CompanyDashboard({ overview, displayName }: CompanyDashboardProps) {
  const hasTeamActivity = overview.teamActivity.length > 0;
  const hasRecentActivity = overview.recentActivity.length > 0;
  const pipelineEmpty =
    overview.pipelineValue <= 0 && overview.revenueForecast.itemCount === 0;

  return (
    <div className="space-y-10">
      <section className="vp-surface-hero vp-blueprint-grid rounded-xl px-6 py-8 sm:px-8 sm:py-9">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="vp-section-label">Company dashboard</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {overview.companyName}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Organization overview for {displayName}. Track team capacity, pipeline
              health, and recent work across your company.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link
              href="/settings/team"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <Users className="size-4" />
              Manage team
            </Link>
            <Link
              href="/analytics"
              className={cn(buttonVariants(), vpTheme.primaryCta, "gap-2 px-5")}
            >
              <BarChart3 className="size-4" />
              View analytics
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Company metrics">
        <p className="vp-section-label mb-3">Company metrics</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnalyticsKpiCard
            title="Active team members"
            value={String(overview.activeTeamMembers)}
            subtitle="Seats in use on your plan"
            icon={Users}
            index={0}
          />
          <AnalyticsKpiCard
            title="Active projects"
            value={String(overview.activeProjects)}
            subtitle="Excludes lost and archived"
            icon={FolderKanban}
            index={1}
          />
          <AnalyticsKpiCard
            title="Estimates this month"
            value={String(overview.estimatesThisMonth)}
            subtitle="Created in the current calendar month"
            icon={PencilLine}
            index={2}
          />
          <AnalyticsKpiCard
            title="Proposals this month"
            value={formatCount(overview.proposalsThisMonth)}
            subtitle={
              overview.proposalsThisMonth === null
                ? "Proposal data is not available"
                : "Created in the current calendar month"
            }
            icon={Send}
            index={3}
          />
          <AnalyticsKpiCard
            title="Pipeline value"
            value={formatCurrency(overview.pipelineValue)}
            subtitle="Open estimate value (analytics definition)"
            icon={FileText}
            highlight={overview.pipelineValue > 0}
            index={4}
          />
        </div>
      </section>

      <section aria-label="Revenue pipeline">
        <p className="vp-section-label mb-3">Revenue pipeline</p>
        {pipelineEmpty ? (
          <div className={`${vpTheme.card} px-6 py-10 text-center`}>
            <p className="text-sm font-medium text-foreground">
              No pipeline data yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Open estimates and proposals will appear here once your team adds
              work to the portfolio.
            </p>
            <Link
              href="/projects"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-6 inline-flex"
              )}
            >
              Go to projects
            </Link>
          </div>
        ) : (
          <RevenueForecastCard forecast={overview.revenueForecast} />
        )}
      </section>

      <section aria-label="Team activity">
        <p className="vp-section-label">Team activity</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          Copilot usage by estimator
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pulled from analytics Copilot sessions across your organization.
        </p>

        {hasTeamActivity ? (
          <div className={`${vpTheme.card} mt-4 overflow-x-auto`}>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Team member
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Sessions
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Messages
                  </th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">
                    Estimates assisted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {overview.teamActivity.map((row) => (
                  <tr key={row.userId} className={vpTheme.interactiveRow}>
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      {row.displayName}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                      {row.sessionCount}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                      {row.messageCount}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                      {row.estimatesAssisted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`${vpTheme.card} mt-4 px-6 py-8 text-center`}>
            <p className="text-sm text-muted-foreground">
              No Copilot usage recorded yet. Activity will show here when estimators
              use VoltPilot Intelligence on estimates.
            </p>
          </div>
        )}
      </section>

      {hasRecentActivity ? (
        <DashboardRecentActivity items={overview.recentActivity} />
      ) : (
        <section>
          <p className="vp-section-label">Activity</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
          <div className={`${vpTheme.card} mt-4 px-6 py-8 text-center`}>
            <p className="text-sm text-muted-foreground">
              No recent portfolio activity yet.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
