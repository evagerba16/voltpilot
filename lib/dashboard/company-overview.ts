import "server-only";

import { generateRevenueForecast } from "@/lib/analytics/forecast-service";
import type { RevenueForecastResult } from "@/lib/analytics/forecast-service";
import { getAnalyticsData } from "@/lib/analytics/queries";
import type { AnalyticsFilters } from "@/lib/analytics/types";
import {
  getOrganizationEntitlements,
  getOrganizationSeatUsage,
  isB2BOrganizationPlan,
} from "@/lib/billing/entitlements";
import { resolveOrganizationDisplayName } from "@/lib/company/display-name";
import { getCompanySettings } from "@/lib/company/queries";
import {
  getDashboardOverview,
  type DashboardActivityItem,
} from "@/lib/dashboard/queries";
import { createClient } from "@/lib/supabase/server";
import type { TeamRole } from "@/lib/teams/types";

const COMPANY_ANALYTICS_FILTERS: AnalyticsFilters = {
  dateRange: "all",
  customerId: "",
  projectId: "",
  projectStatus: "",
};

function startOfCalendarMonthIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

async function getCreatedThisMonthCounts() {
  const supabase = await createClient();
  const monthStart = startOfCalendarMonthIso();

  const [estimatesResult, proposalsResult] = await Promise.all([
    supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
  ]);

  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }

  const proposalsUnavailable =
    proposalsResult.error &&
    proposalsResult.error.message.includes("proposals");

  if (proposalsResult.error && !proposalsUnavailable) {
    throw new Error(proposalsResult.error.message);
  }

  return {
    estimatesThisMonth: estimatesResult.count ?? 0,
    proposalsThisMonth: proposalsUnavailable ? null : (proposalsResult.count ?? 0),
  };
}

export type CompanyTeamActivityRow = {
  userId: string;
  displayName: string;
  sessionCount: number;
  messageCount: number;
  estimatesAssisted: number;
};

export type CompanyDashboardOverview = {
  companyName: string;
  activeTeamMembers: number;
  activeProjects: number;
  /** Count of estimate records with created_at in the current calendar month. */
  estimatesThisMonth: number;
  /** Count of proposal records with created_at in the current calendar month, or null if proposals table unavailable. */
  proposalsThisMonth: number | null;
  /** Same definition as Analytics executive pipeline value (all-time, org-scoped). */
  pipelineValue: number;
  revenueForecast: RevenueForecastResult;
  recentActivity: DashboardActivityItem[];
  teamActivity: CompanyTeamActivityRow[];
};

export function isCompanyDashboardEligible(
  role: TeamRole,
  planType: Awaited<
    ReturnType<typeof getOrganizationEntitlements>
  >["planType"]
): boolean {
  return isB2BOrganizationPlan(planType) && (role === "owner" || role === "admin");
}

export async function getCompanyDashboardOverview(
  organizationId: string,
  organizationName: string,
  userId: string
): Promise<CompanyDashboardOverview> {
  const [
    companySettings,
    seatUsage,
    dashboardOverview,
    analytics,
    monthCounts,
  ] = await Promise.all([
    getCompanySettings(organizationId, userId),
    getOrganizationSeatUsage(organizationId),
    getDashboardOverview(),
    getAnalyticsData(COMPANY_ANALYTICS_FILTERS),
    getCreatedThisMonthCounts(),
  ]);

  const revenueForecast = generateRevenueForecast(
    analytics.revenueForecast,
    analytics.generatedAt
  );

  const activeProjectsKpi = dashboardOverview.kpis.find(
    (kpi) => kpi.id === "active-projects"
  );

  return {
    companyName: resolveOrganizationDisplayName(
      companySettings.company_name,
      organizationName
    ),
    activeTeamMembers: seatUsage.activeMembers,
    activeProjects: activeProjectsKpi
      ? Number.parseInt(activeProjectsKpi.value, 10) || analytics.executive.activeProjects
      : analytics.executive.activeProjects,
    estimatesThisMonth: monthCounts.estimatesThisMonth,
    proposalsThisMonth: monthCounts.proposalsThisMonth,
    pipelineValue: analytics.executive.pipelineValue,
    revenueForecast,
    recentActivity: dashboardOverview.recentActivity,
    teamActivity: analytics.ai.usageByEstimator.slice(0, 8),
  };
}
