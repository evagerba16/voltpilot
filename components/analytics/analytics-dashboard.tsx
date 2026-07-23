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
  Percent,
  PencilLine,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AiBusinessCoachCard } from "@/components/analytics/ai-business-coach-card";
import { AnalyticsExecutiveOverview } from "@/components/analytics/analytics-executive-overview";
import { AnalyticsFiltersBar } from "@/components/analytics/analytics-filters-bar";
import { AnalyticsAiSummary } from "@/components/analytics/analytics-ai-summary";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import {
  CountTooltip,
  CurrencyTooltip,
  PercentTooltip,
} from "@/components/analytics/analytics-chart-tooltips";
import { ChartCard } from "@/components/analytics/chart-card";
import { CustomerIntelligenceCard } from "@/components/analytics/customer-intelligence-card";
import { EstimateIntelligenceCard } from "@/components/analytics/estimate-intelligence-card";
import { ProposalIntelligenceCard } from "@/components/analytics/proposal-intelligence-card";
import { ProfitForecastCard } from "@/components/analytics/profit-forecast-card";
import { RevenueForecastCard } from "@/components/analytics/revenue-forecast-card";
import { StatCard } from "@/components/dashboard/stat-card";
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

  const { analytics, forecasts, aiInsights, pipelineWithColor } = precomputed;

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
        onRefresh={handleRefresh}
      />

      {activeSection === "executive" ? (
        <AnalyticsExecutiveOverview data={data} precomputed={precomputed} />
      ) : null}

      {activeSection === "estimating" ? (
        <>
          <EstimateIntelligenceCard intelligence={analytics.estimateIntelligence} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Estimate accuracy"
              value={formatPercent(data.estimating.estimateAccuracyPercent)}
              change="Version-to-version variance"
              icon={Percent}
            />
            <StatCard
              title="Cost variance"
              value={formatPercent(data.estimating.costVariancePercent)}
              change={`Est ${formatCurrency(data.estimating.estimatedTotal)} · Act ${formatCurrency(data.estimating.actualTotal)}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Labor utilization"
              value={formatPercent(data.estimating.laborUtilizationPercent)}
              change="Labor share of direct costs"
              icon={Users}
            />
            <StatCard
              title="Change orders"
              value={String(data.estimating.changeOrderCount)}
              change={`${data.estimating.costOverrunCount} cost overruns`}
              icon={PencilLine}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Material cost trends"
              description="Monthly material spend across filtered estimates."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.estimating.materialCostTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Equipment cost trends"
              description="Monthly equipment spend across filtered estimates."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.estimating.equipmentCostTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
            <StatCard
              title="Acceptance rate"
              value={formatPercent(data.proposals.acceptanceRate)}
              change={`${data.proposals.totalDecided} decided`}
              changeType={data.proposals.acceptanceRate >= 40 ? "positive" : "neutral"}
              icon={Percent}
            />
            <StatCard
              title="Decline rate"
              value={formatPercent(data.proposals.declineRate)}
              icon={Percent}
            />
            <StatCard
              title="Avg sales cycle"
              value={`${data.proposals.averageSalesCycleDays.toFixed(1)}d`}
              change="Sent to decision"
              icon={Send}
            />
            <StatCard
              title="Avg proposal value"
              value={formatCurrency(data.proposals.averageProposalValue)}
              icon={CircleDollarSign}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Revenue won"
              value={formatCurrency(data.proposals.revenueWon)}
              changeType="positive"
              icon={TrendingUp}
            />
            <StatCard
              title="Revenue lost"
              value={formatCurrency(data.proposals.revenueLost)}
              changeType={data.proposals.revenueLost > 0 ? "negative" : "neutral"}
              icon={CircleDollarSign}
            />
            <StatCard
              title="Proposals sent"
              value={String(data.proposals.totalSent)}
              icon={Send}
            />
          </div>

          <ChartCard
            title="Proposal volume"
            description="Proposals created over the selected period."
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.proposals.proposalVolumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CountTooltip suffix="proposals" />} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      ) : null}

      {activeSection === "customers" ? (
        <>
          <CustomerIntelligenceCard intelligence={analytics.customerIntelligence} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Repeat customer rate"
              value={formatPercent(data.customers.repeatCustomerRate)}
              icon={Users}
            />
            <StatCard
              title="Avg customer value"
              value={formatCurrency(data.customers.averageCustomerValue)}
              icon={CircleDollarSign}
            />
            <StatCard
              title="Customer lifetime value"
              value={formatCurrency(data.customers.customerLifetimeValue)}
              change="Avg value × avg projects per customer"
              icon={TrendingUp}
            />
            <StatCard
              title="Top customers"
              value={String(data.customers.topCustomers.length)}
              change="In selected period"
              icon={Users}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Customer growth"
              description="New customers added over time."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.customers.customerGrowthTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CountTooltip suffix="customers" />} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Revenue by customer"
              description="Top customers by revenue contribution."
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.customers.revenueByCustomer} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="companyName" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Projects by status"
              description="Pipeline distribution for filtered projects."
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineWithColor} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {pipelineWithColor.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Status distribution"
              description="Share of projects by current status."
            >
              <div className="h-80">
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
                    >
                      {pipelineWithColor
                        .filter((stage) => stage.count > 0)
                        .map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
            <StatCard
              title="AI-assisted estimates"
              value={String(data.ai.aiGeneratedEstimates)}
              icon={Bot}
            />
            <StatCard
              title="AI adoption rate"
              value={formatPercent(data.ai.aiAdoptionRate)}
              icon={Sparkles}
            />
            <StatCard
              title="Time saved"
              value={`${data.ai.estimatedTimeSavedHours.toFixed(1)}h`}
              change="AI completion delta + session time"
              changeType="positive"
              icon={TrendingUp}
            />
            <StatCard
              title="Recommendation acceptance"
              value={formatPercent(data.ai.recommendationAcceptanceRate)}
              icon={Percent}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Avg estimate completion"
              value={`${data.ai.averageEstimateCompletionHours.toFixed(1)}h`}
              change="Creation to final update"
              icon={PencilLine}
            />
            <StatCard
              title="Active estimators using AI"
              value={String(data.ai.usageByEstimator.length)}
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
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Profit trends" description="Gross profit from estimates over time.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.profitTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Win rate trends" description="Proposal win rate by period.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.winRateTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<PercentTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Estimate volume" description="Estimates created over time.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.estimateVolumeTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CountTooltip suffix="estimates" />} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Proposal volume" description="Proposals created over time.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.proposalVolumeTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CountTooltip suffix="proposals" />} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Customer growth" description="New customers added over time.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.customerGrowthTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CountTooltip suffix="customers" />} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Project pipeline" description="Projects and value by status.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineWithColor}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count">
                      {pipelineWithColor.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Monthly recurring revenue"
              description="Projected MRR from awarded projects (value ÷ 12)."
            >
              <div className="mb-4 rounded-lg bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">Current projected MRR</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.charts.monthlyRecurringRevenue)}
                </p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.mrrTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
