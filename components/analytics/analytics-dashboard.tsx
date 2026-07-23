"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  BarChart3,
  Bot,
  CircleDollarSign,
  Download,
  FileDown,
  FileText,
  FolderKanban,
  Percent,
  PencilLine,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AiBusinessCoachCard } from "@/components/analytics/ai-business-coach-card";
import { AiOpportunitiesPanel } from "@/components/analytics/ai-opportunities-panel";
import { ChartCard } from "@/components/analytics/chart-card";
import { CustomerIntelligenceCard } from "@/components/analytics/customer-intelligence-card";
import { EstimateIntelligenceCard } from "@/components/analytics/estimate-intelligence-card";
import { ProposalIntelligenceCard } from "@/components/analytics/proposal-intelligence-card";
import { ProfitForecastCard } from "@/components/analytics/profit-forecast-card";
import { RevenueForecastCard } from "@/components/analytics/revenue-forecast-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/analytics/format";
import {
  ANALYTICS_DATE_RANGES,
  ANALYTICS_SECTIONS,
  type AnalyticsData,
  type AnalyticsSection,
  type CustomerFilterOption,
  type ProjectFilterOption,
} from "@/lib/analytics/types";
import {
  buildAnalyticsExportUrl,
  buildAnalyticsUrl,
} from "@/lib/analytics/url";
import type { PrecomputedAnalyticsViewModels } from "@/lib/analytics/precompute-view-models";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/utils";

type AnalyticsDashboardProps = {
  data: AnalyticsData;
  customers: CustomerFilterOption[];
  projects: ProjectFilterOption[];
  activeSection: AnalyticsSection;
  precomputed: PrecomputedAnalyticsViewModels;
};

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function PercentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatPercent(payload[0].value)}</p>
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
  suffix = "items",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].value} {suffix}
      </p>
    </div>
  );
}

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

const ACTIVITY_ICONS = {
  customer: Users,
  project: FolderKanban,
  estimate: PencilLine,
  proposal: FileText,
} as const;

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
              <td
                colSpan={headers.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
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

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
  const [selectedCustomer, setSelectedCustomer] = useState(data.filters.customerId);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const visibleProjects = useMemo(() => {
    if (!selectedCustomer) return projects;
    return projects.filter((project) => project.customer_id === selectedCustomer);
  }, [projects, selectedCustomer]);

  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const intervalId = window.setInterval(refreshIfVisible, 60_000);
    return () => window.clearInterval(intervalId);
  }, [router]);

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
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <form
          method="GET"
          className="flex flex-col gap-3 border-b border-border px-6 py-4"
        >
          <input type="hidden" name="section" value={activeSection} />
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor="range" className="text-sm font-medium">
                Date range
              </label>
              <select
                id="range"
                name="range"
                defaultValue={data.filters.dateRange}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ANALYTICS_DATE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="customer" className="text-sm font-medium">
                Customer
              </label>
              <select
                id="customer"
                name="customer"
                defaultValue={data.filters.customerId}
                onChange={(event) => setSelectedCustomer(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="project" className="text-sm font-medium">
                Project
              </label>
              <select
                id="project"
                name="project"
                defaultValue={data.filters.projectId}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All projects</option>
                {visibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Project status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={data.filters.projectStatus}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">All statuses</option>
                {PROJECT_STATUSES.filter((status) => status !== "Archived").map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit">Apply filters</Button>
            <Link
              href={buildAnalyticsUrl({ section: activeSection })}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
              )}
            >
              Reset
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-8"
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn("mr-2 size-4", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
            <a
              href={buildAnalyticsExportUrl("csv", data.filters)}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </a>
            <a
              href={buildAnalyticsExportUrl("pdf", data.filters)}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <FileDown className="mr-2 size-4" />
              Export PDF
            </a>
            <span className="text-xs text-muted-foreground">
              Updated {formatGeneratedAt(data.generatedAt)} · auto-refresh every 60s
            </span>
          </div>
        </form>

        <div className="flex gap-1 overflow-x-auto px-4 py-3">
          {ANALYTICS_SECTIONS.map((section) => (
            <Link
              key={section.value}
              href={buildAnalyticsUrl({
                range: data.filters.dateRange,
                customer: data.filters.customerId,
                project: data.filters.projectId,
                status: data.filters.projectStatus,
                section: section.value,
              })}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeSection === section.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.label}
            </Link>
          ))}
        </div>
      </div>

      <AiOpportunitiesPanel opportunities={aiInsights.opportunities} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiBusinessCoachCard coach={aiInsights.businessCoach} />
        </div>
        <div className="space-y-6 xl:col-span-1">
          <RevenueForecastCard forecast={forecasts.revenue} />
          <ProfitForecastCard forecast={forecasts.profit} />
        </div>
      </div>

      {activeSection === "executive" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Revenue"
              value={formatCurrency(data.executive.revenue)}
              change="Accepted proposals"
              changeType={data.executive.revenue > 0 ? "positive" : "neutral"}
              icon={CircleDollarSign}
            />
            <StatCard
              title="Gross profit"
              value={formatCurrency(data.executive.grossProfit)}
              change="From estimate margins"
              icon={TrendingUp}
            />
            <StatCard
              title="Gross margin"
              value={formatPercent(data.executive.grossMarginPercent)}
              changeType={
                data.executive.grossMarginPercent >= 15 ? "positive" : "neutral"
              }
              icon={Percent}
            />
            <StatCard
              title="Win rate"
              value={formatPercent(data.executive.winRate)}
              change={`${data.proposals.totalDecided} decided proposals`}
              changeType={data.executive.winRate >= 40 ? "positive" : "neutral"}
              icon={BarChart3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total estimates"
              value={String(data.executive.totalEstimates)}
              icon={PencilLine}
            />
            <StatCard
              title="Total proposals"
              value={String(data.executive.totalProposals)}
              icon={FileText}
            />
            <StatCard
              title="Active projects"
              value={String(data.executive.activeProjects)}
              icon={FolderKanban}
            />
            <StatCard
              title="Pipeline value"
              value={formatCurrency(data.executive.pipelineValue)}
              icon={CircleDollarSign}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Avg estimate size"
              value={formatCurrency(data.executive.averageEstimateSize)}
              icon={PencilLine}
            />
            <StatCard
              title="Avg project margin"
              value={formatPercent(data.executive.averageProjectMargin)}
              icon={Percent}
            />
            <StatCard
              title="Avg estimate production"
              value={`${data.executive.averageEstimateProductionHours.toFixed(1)}h`}
              change="Creation to final update"
              icon={PencilLine}
            />
            <StatCard
              title="Avg proposal acceptance"
              value={`${data.executive.averageProposalAcceptanceDays.toFixed(1)}d`}
              change="Sent to accepted"
              icon={Send}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold">Recent activity</h2>
                <p className="text-sm text-muted-foreground">
                  Latest updates across customers, projects, estimates, and proposals.
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {data.recentActivity.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No activity in the selected period.
                  </p>
                ) : (
                  data.recentActivity.map((item) => {
                    const Icon = ACTIVITY_ICONS[item.type];

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.action}</p>
                          <p className="truncate text-sm text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          <RelativeTime value={item.timestamp} />
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold">Recent estimates</h2>
                <p className="text-sm text-muted-foreground">
                  Drill down into the latest estimates in your portfolio.
                </p>
              </div>
              <DataTable
                headers={["Estimate", "Total", "Margin"]}
                rows={data.recentEstimates.map((estimate) => [
                  <div key={estimate.id}>
                    <DrillDownLink href={`/estimates/${estimate.id}`}>
                      {estimate.title}
                    </DrillDownLink>
                    <p className="text-xs text-muted-foreground">{estimate.projectName}</p>
                  </div>,
                  <span key="total" className="font-medium tabular-nums">
                    {formatCurrency(estimate.grandTotal)}
                  </span>,
                  formatPercent(estimate.profitMarginPercent),
                ])}
                emptyMessage="No estimates in the selected period."
              />
            </div>
          </div>
        </>
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
