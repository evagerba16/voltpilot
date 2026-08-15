"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bot,
  CircleDollarSign,
  FolderKanban,
  Percent,
  PencilLine,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AiBusinessCoachCard } from "@/components/analytics/ai-business-coach-card";
import { AnalyticsChartFrame } from "@/components/analytics/analytics-chart-frame";
import { AnalyticsExecutiveOverview } from "@/components/analytics/analytics-executive-overview";
import { AnalyticsFiltersBar } from "@/components/analytics/analytics-filters-bar";
import { AnalyticsAiSummary } from "@/components/analytics/analytics-ai-summary";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import {
  CountTooltip,
  CurrencyTooltip,
  PercentTooltip,
  PipelineTooltip,
} from "@/components/analytics/analytics-chart-tooltips";
import { AnalyticsKpiCard } from "@/components/analytics/analytics-kpi-card";
import { ChartCard } from "@/components/analytics/chart-card";
import { CustomerIntelligenceCard } from "@/components/analytics/customer-intelligence-card";
import { EstimateIntelligenceCard } from "@/components/analytics/estimate-intelligence-card";
import { ProposalIntelligenceCard } from "@/components/analytics/proposal-intelligence-card";
import { ProfitForecastCard } from "@/components/analytics/profit-forecast-card";
import { RevenueForecastCard } from "@/components/analytics/revenue-forecast-card";
import {
  CHART_ANIMATION,
  CHART_AXIS,
  CHART_COLORS,
  CHART_GRID,
  CHART_MARGINS,
} from "@/lib/analytics/chart-theme";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/analytics/format";
import type { PrecomputedAnalyticsViewModels } from "@/lib/analytics/precompute-view-models";
import {
  type AnalyticsData,
  type AnalyticsSection,
  type CustomerFilterOption,
  type ProjectFilterOption,
} from "@/lib/analytics/types";
import { buildAnalyticsUrl } from "@/lib/analytics/url";

type AnalyticsDashboardProps = {
  data: AnalyticsData;
  customers: CustomerFilterOption[];
  projects: ProjectFilterOption[];
  activeSection: AnalyticsSection;
  precomputed: PrecomputedAnalyticsViewModels;
  compareEnabled: boolean;
};

function DrillDownLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

function DataTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-0">
                <AnalyticsEmptyState
                  compact
                  title="No data in this period"
                  description={emptyMessage}
                />
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="hover:bg-muted/20">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsDashboard({
  data,
  customers,
  projects,
  activeSection,
  precomputed,
  compareEnabled,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const { analytics, forecasts, aiInsights, pipelineWithColor, comparisons } =
    precomputed;

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      setRefreshing(false);
      refreshTimerRef.current = null;
    }, 600);
  };

  return (
    <div className="space-y-8">
      <AnalyticsFiltersBar
        data={data}
        customers={customers}
        projects={projects}
        activeSection={activeSection}
        refreshing={refreshing}
        compareEnabled={compareEnabled}
        onRefresh={handleRefresh}
      />

      {activeSection === "executive" ? (
        <AnalyticsExecutiveOverview
          data={data}
          precomputed={precomputed}
          compareEnabled={compareEnabled}
        />
      ) : null}

      {activeSection === "estimating" ? (
        <>
          <EstimateIntelligenceCard intelligence={analytics.estimateIntelligence} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              index={0}
              title="Estimate accuracy"
              value={formatPercent(data.estimating.estimateAccuracyPercent)}
              subtitle="Version-to-version variance"
              tooltip="How closely revised estimate totals match prior versions."
              icon={Percent}
              comparison={comparisons.estimating.estimateAccuracyPercent}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={1}
              title="Cost variance"
              value={formatPercent(data.estimating.costVariancePercent)}
              subtitle={`Est ${formatCurrency(data.estimating.estimatedTotal)} · Act ${formatCurrency(data.estimating.actualTotal)}`}
              tooltip="Difference between estimated and actual job costs."
              icon={TrendingUp}
              comparison={comparisons.estimating.costVariancePercent}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={2}
              title="Labor utilization"
              value={formatPercent(data.estimating.laborUtilizationPercent)}
              subtitle="Labor share of direct costs"
              tooltip="Labor costs as a percentage of total direct costs."
              icon={Users}
              comparison={comparisons.estimating.laborUtilizationPercent}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={3}
              title="Change orders"
              value={String(data.estimating.changeOrderCount)}
              subtitle={`${data.estimating.costOverrunCount} cost overruns`}
              tooltip="Change orders recorded against job actuals."
              icon={PencilLine}
              comparison={comparisons.estimating.changeOrderCount}
              compareEnabled={compareEnabled}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Material cost trends"
              description="Monthly material spend across filtered estimates."
            >
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.estimating.materialCostTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={48} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.material, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.material} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.material }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard
              title="Equipment cost trends"
              description="Monthly equipment spend across filtered estimates."
            >
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.estimating.equipmentCostTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={48} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.equipment, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.equipment} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.equipment }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Margin by project</h2>
            </div>
            <DataTable
              headers={["Project", "Customer", "Margin", "Revenue"]}
              rows={data.estimating.marginByProject.map((project) => [
                <DrillDownLink key={project.projectId} href={`/projects/${project.projectId}`}>
                  {project.projectName}
                </DrillDownLink>,
                project.customerName,
                formatPercent(project.marginPercent),
                <span key="rev" className="font-medium tabular-nums">
                  {formatCurrency(project.revenue)}
                </span>,
              ])}
              emptyMessage="No project margin data in this period."
            />
          </div>
        </>
      ) : null}

      {activeSection === "proposals" ? (
        <>
          <ProposalIntelligenceCard intelligence={analytics.proposalIntelligence} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              index={0}
              title="Acceptance rate"
              value={formatPercent(data.proposals.acceptanceRate)}
              subtitle={`${data.proposals.totalDecided} decided`}
              tooltip="Share of decided proposals that were accepted."
              icon={Percent}
              comparison={comparisons.proposals.acceptanceRate}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={1}
              title="Decline rate"
              value={formatPercent(data.proposals.declineRate)}
              tooltip="Share of decided proposals that were declined."
              icon={Percent}
            />
            <AnalyticsKpiCard
              index={2}
              title="Avg sales cycle"
              value={`${data.proposals.averageSalesCycleDays.toFixed(1)}d`}
              subtitle="Sent to decision"
              tooltip="Average days from proposal sent to customer decision."
              icon={Send}
              comparison={comparisons.proposals.averageSalesCycleDays}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={3}
              title="Avg proposal value"
              value={formatCurrency(data.proposals.averageProposalValue)}
              tooltip="Mean value of proposals in the selected period."
              icon={CircleDollarSign}
              comparison={comparisons.proposals.averageProposalValue}
              compareEnabled={compareEnabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <AnalyticsKpiCard
              index={4}
              title="Revenue won"
              value={formatCurrency(data.proposals.revenueWon)}
              tooltip="Total revenue from accepted proposals."
              icon={TrendingUp}
              comparison={comparisons.proposals.revenueWon}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={5}
              title="Revenue lost"
              value={formatCurrency(data.proposals.revenueLost)}
              tooltip="Total value of declined proposals."
              icon={CircleDollarSign}
            />
            <AnalyticsKpiCard
              index={6}
              title="Proposals sent"
              value={String(data.proposals.totalSent)}
              tooltip="Proposals sent to customers during this period."
              icon={Send}
              comparison={comparisons.proposals.totalSent}
              compareEnabled={compareEnabled}
            />
          </div>

          <ChartCard
            title="Proposal volume"
            description="Proposals created over the selected period."
          >
            <AnalyticsChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.proposals.proposalVolumeTrend} margin={CHART_MARGINS.default}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="label" {...CHART_AXIS} />
                  <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                  <Tooltip content={<CountTooltip suffix="proposals" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="count" fill={CHART_COLORS.proposals} radius={[6, 6, 0, 0]} {...CHART_ANIMATION} />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartFrame>
          </ChartCard>
        </>
      ) : null}

      {activeSection === "customers" ? (
        <>
          <CustomerIntelligenceCard intelligence={analytics.customerIntelligence} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              index={0}
              title="Repeat customer rate"
              value={formatPercent(data.customers.repeatCustomerRate)}
              tooltip="Customers with more than one project in your portfolio."
              icon={Users}
              comparison={comparisons.customers.repeatCustomerRate}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={1}
              title="Avg customer value"
              value={formatCurrency(data.customers.averageCustomerValue)}
              tooltip="Average revenue per customer in the selected period."
              icon={CircleDollarSign}
              comparison={comparisons.customers.averageCustomerValue}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={2}
              title="Customer lifetime value"
              value={formatCurrency(data.customers.customerLifetimeValue)}
              subtitle="Avg value × avg projects per customer"
              tooltip="Estimated lifetime value based on average project count and revenue."
              icon={TrendingUp}
              comparison={comparisons.customers.customerLifetimeValue}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={3}
              title="Top customers"
              value={String(data.customers.topCustomers.length)}
              subtitle="In selected period"
              tooltip="Number of customers ranked in the top revenue list."
              icon={Users}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Customer growth"
              description="New customers added over time."
            >
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.customers.customerGrowthTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                    <Tooltip content={<CountTooltip suffix="customers" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={CHART_COLORS.customers} radius={[6, 6, 0, 0]} {...CHART_ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard
              title="Revenue by customer"
              description="Top customers by revenue contribution."
            >
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.customers.revenueByCustomer} layout="vertical" margin={{ ...CHART_MARGINS.verticalBar, left: 20 }}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis type="number" {...CHART_AXIS} />
                    <YAxis type="category" dataKey="companyName" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[0, 6, 6, 0]} {...CHART_ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Top customers</h2>
            </div>
            <DataTable
              headers={["Customer", "Revenue", "Projects", "Estimates"]}
              rows={data.customers.topCustomers.map((customer) => [
                <DrillDownLink
                  key={customer.customerId}
                  href={buildAnalyticsUrl({
                    range: data.filters.dateRange,
                    customer: customer.customerId,
                    section: "customers",
                  })}
                >
                  {customer.companyName}
                </DrillDownLink>,
                <span key="rev" className="font-medium tabular-nums">
                  {formatCurrency(customer.revenue)}
                </span>,
                customer.projectCount,
                customer.estimateCount,
              ])}
              emptyMessage="No customer data in this period."
            />
          </div>
        </>
      ) : null}

      {activeSection === "projects" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              index={0}
              title="Total projects"
              value={String(
                data.projects.projectsByStatus.reduce(
                  (sum, stage) => sum + stage.count,
                  0
                )
              )}
              subtitle="Across all statuses"
              tooltip="Total number of projects matching your filters."
              icon={FolderKanban}
              comparison={comparisons.projects.totalProjects}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={1}
              title="Awarded projects"
              value={String(
                data.projects.projectsByStatus.find(
                  (stage) => stage.status === "Awarded"
                )?.count ?? 0
              )}
              subtitle="Won work in pipeline"
              tooltip="Projects currently in Awarded status."
              icon={TrendingUp}
              comparison={comparisons.projects.awardedCount}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={2}
              title="Avg project margin"
              value={formatPercent(
                data.projects.profitabilityByProject.length > 0
                  ? data.projects.profitabilityByProject.reduce(
                      (sum, project) => sum + project.marginPercent,
                      0
                    ) / data.projects.profitabilityByProject.length
                  : 0
              )}
              subtitle="From profitability data"
              tooltip="Average gross margin across projects with profitability records."
              icon={Percent}
              comparison={comparisons.projects.averageMargin}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={3}
              title="Project revenue"
              value={formatCurrency(
                data.projects.revenueByProject.reduce(
                  (sum, project) => sum + project.revenue,
                  0
                )
              )}
              subtitle="Accepted proposal revenue"
              tooltip="Total revenue attributed to projects in this period."
              icon={CircleDollarSign}
              comparison={comparisons.projects.totalRevenue}
              compareEnabled={compareEnabled}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Projects by status"
              description="Pipeline distribution for filtered projects."
            >
              <AnalyticsChartFrame height="lg">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineWithColor} layout="vertical" margin={{ ...CHART_MARGINS.verticalBar, left: 20 }}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis type="number" allowDecimals={false} {...CHART_AXIS} />
                    <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<PipelineTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} {...CHART_ANIMATION}>
                      {pipelineWithColor.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard
              title="Status distribution"
              description="Share of projects by current status."
            >
              <AnalyticsChartFrame height="lg">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineWithColor.filter((stage) => stage.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      {...CHART_ANIMATION}
                    >
                      {pipelineWithColor
                        .filter((stage) => stage.count > 0)
                        .map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip content={<PipelineTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold">Profitability by project</h2>
              </div>
              <DataTable
                headers={["Project", "Customer", "Margin", "Profit"]}
                rows={data.projects.profitabilityByProject.map((project) => [
                  <DrillDownLink key={project.projectId} href={`/projects/${project.projectId}`}>
                    {project.projectName}
                  </DrillDownLink>,
                  project.customerName,
                  formatPercent(project.marginPercent),
                  formatCurrency(project.profit),
                ])}
                emptyMessage="No profitability data in this period."
              />
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold">Largest projects</h2>
              </div>
              <DataTable
                headers={["Project", "Customer", "Value"]}
                rows={data.projects.largestProjects.map((project) => [
                  <DrillDownLink key={project.projectId} href={`/projects/${project.projectId}`}>
                    {project.projectName}
                  </DrillDownLink>,
                  project.customerName,
                  formatCurrency(project.value),
                ])}
                emptyMessage="No projects in this period."
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Most profitable projects</h2>
            </div>
            <DataTable
              headers={["Project", "Customer", "Margin", "Profit"]}
              rows={data.projects.mostProfitableProjects.map((project) => [
                <DrillDownLink key={project.projectId} href={`/projects/${project.projectId}`}>
                  {project.projectName}
                </DrillDownLink>,
                project.customerName,
                formatPercent(project.marginPercent),
                formatCurrency(project.profit),
              ])}
              emptyMessage="No profitability data in this period."
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">Revenue by project</h2>
            </div>
            <DataTable
              headers={["Project", "Customer", "Status", "Revenue"]}
              rows={data.projects.revenueByProject.map((project) => [
                <DrillDownLink key={project.projectId} href={`/projects/${project.projectId}`}>
                  {project.projectName}
                </DrillDownLink>,
                project.customerName,
                project.status,
                <span key="rev" className="font-medium tabular-nums">
                  {formatCurrency(project.revenue)}
                </span>,
              ])}
              emptyMessage="No project revenue in this period."
            />
          </div>
        </>
      ) : null}

      {activeSection === "ai" ? (
        <>
          <AnalyticsAiSummary
            data={data}
            analytics={analytics}
            aiInsights={aiInsights}
          />

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <AiBusinessCoachCard coach={aiInsights.businessCoach} />
            </div>
            <div className="space-y-6 xl:col-span-1">
              <RevenueForecastCard forecast={forecasts.revenue} />
              <ProfitForecastCard forecast={forecasts.profit} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              index={0}
              title="AI-assisted estimates"
              value={String(data.ai.aiGeneratedEstimates)}
              tooltip="Estimates where the AI assistant contributed during creation."
              icon={Bot}
              comparison={comparisons.ai.aiGeneratedEstimates}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={1}
              title="AI adoption rate"
              value={formatPercent(data.ai.aiAdoptionRate)}
              tooltip="Percentage of estimates that used AI assistance."
              icon={Sparkles}
              comparison={comparisons.ai.aiAdoptionRate}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={2}
              title="Time saved"
              value={`${data.ai.estimatedTimeSavedHours.toFixed(1)}h`}
              subtitle="AI completion delta + session time"
              tooltip="Estimated hours saved through AI-assisted estimating."
              icon={TrendingUp}
              comparison={comparisons.ai.estimatedTimeSavedHours}
              compareEnabled={compareEnabled}
            />
            <AnalyticsKpiCard
              index={3}
              title="Recommendation acceptance"
              value={formatPercent(data.ai.recommendationAcceptanceRate)}
              tooltip="Rate at which AI recommendations were applied by estimators."
              icon={Percent}
              comparison={comparisons.ai.recommendationAcceptanceRate}
              compareEnabled={compareEnabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AnalyticsKpiCard
              index={4}
              title="Avg estimate completion"
              value={`${data.ai.averageEstimateCompletionHours.toFixed(1)}h`}
              subtitle="Creation to final update"
              tooltip="Average time from estimate creation to last update."
              icon={PencilLine}
            />
            <AnalyticsKpiCard
              index={5}
              title="Active estimators using AI"
              value={String(data.ai.usageByEstimator.length)}
              tooltip="Team members with AI assistant sessions in this period."
              icon={Users}
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold">AI usage by estimator</h2>
            </div>
            <DataTable
              headers={["Estimator", "Sessions", "Messages", "Estimates assisted"]}
              rows={data.ai.usageByEstimator.map((estimator) => [
                estimator.displayName,
                estimator.sessionCount,
                estimator.messageCount,
                estimator.estimatesAssisted,
              ])}
              emptyMessage="No AI usage data yet. Use the AI assistant in Estimate Builder."
            />
          </div>
        </>
      ) : null}

      {activeSection === "charts" ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Revenue trends" description="Estimated selling price over time.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.revenueTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={48} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.revenue, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.revenue} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.revenue }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard title="Profit trends" description="Gross profit from estimates over time.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.profitTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={48} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.profit, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.profit} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.profit }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Win rate trends" description="Proposal win rate by period.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.winRateTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={40} />
                    <Tooltip content={<PercentTooltip />} cursor={{ stroke: CHART_COLORS.winRate, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.winRate} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.winRate }} activeDot={{ r: 6 }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard title="Estimate volume" description="Estimates created over time.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.estimateVolumeTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                    <Tooltip content={<CountTooltip suffix="estimates" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={CHART_COLORS.estimates} radius={[6, 6, 0, 0]} {...CHART_ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Proposal volume" description="Proposals created over time.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.proposalVolumeTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                    <Tooltip content={<CountTooltip suffix="proposals" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={CHART_COLORS.proposals} radius={[6, 6, 0, 0]} {...CHART_ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard title="Customer growth" description="New customers added over time.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.customerGrowthTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                    <Tooltip content={<CountTooltip suffix="customers" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={CHART_COLORS.customers} radius={[6, 6, 0, 0]} {...CHART_ANIMATION} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Project pipeline" description="Projects and value by status.">
              <AnalyticsChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineWithColor} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="status" {...CHART_AXIS} />
                    <YAxis allowDecimals={false} {...CHART_AXIS} width={32} />
                    <Tooltip content={<PipelineTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} {...CHART_ANIMATION}>
                      {pipelineWithColor.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>

            <ChartCard
              title="Monthly recurring revenue"
              description="Projected MRR from awarded projects (value ÷ 12)."
            >
              <div className="mb-4 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent px-4 py-3">
                <p className="text-sm text-muted-foreground">Current projected MRR</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(data.charts.monthlyRecurringRevenue)}
                </p>
              </div>
              <AnalyticsChartFrame height="sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.mrrTrend} margin={CHART_MARGINS.default}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} width={48} />
                    <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: CHART_COLORS.mrr, strokeOpacity: 0.2 }} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS.mrr} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.mrr }} {...CHART_ANIMATION} />
                  </LineChart>
                </ResponsiveContainer>
              </AnalyticsChartFrame>
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
