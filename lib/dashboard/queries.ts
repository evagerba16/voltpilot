import "server-only";

import {
  CircleDollarSign,
  DollarSign,
  FileText,
  FolderKanban,
  Percent,
  PencilLine,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { safePercent } from "@/lib/analytics/time-buckets";
import { buildDashboardBriefing } from "@/lib/dashboard/briefing";
import { resolveDashboardPrimaryAction, type DashboardPrimaryAction } from "@/lib/dashboard/primary-action";
import { parseNumber } from "@/lib/projects/format";
import { getProjectStats } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export type DashboardKpi = {
  id: string;
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  highlight?: boolean;
  href?: string;
};

export type DashboardUpcomingJob = {
  id: string;
  projectName: string;
  customerName: string;
  status: string;
  value: number;
  timingLabel: string;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  type: "customer" | "project" | "estimate" | "proposal";
  action: string;
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
};

export type DashboardOverview = {
  isPortfolioEmpty: boolean;
  primaryAction: DashboardPrimaryAction;
  kpis: DashboardKpi[];
  priorities: ReturnType<typeof buildDashboardBriefing>["priorities"];
  hasRisk: boolean;
  continueWorking: ReturnType<typeof buildDashboardBriefing>["continueWorking"];
  upcomingJobs: DashboardUpcomingJob[];
  recentActivity: DashboardActivityItem[];
};

const UPCOMING_STATUSES = new Set([
  "Awarded",
  "Proposal Sent",
  "Estimating",
  "Active",
]);

function startOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatTimingLabel(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} wk ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function normalizeCustomer(
  customer: { company_name: string } | { company_name: string }[] | null | undefined
) {
  if (Array.isArray(customer)) {
    return customer[0] ?? null;
  }

  return customer ?? null;
}

export function isPortfolioEmptyFromOverview(overview: DashboardOverview) {
  return overview.isPortfolioEmpty;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createClient();
  const monthStart = startOfMonth();

  const [projectsResult, estimatesResult, proposalsResult, customersResult, jobActualsResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `
            id,
            project_name,
            status,
            estimated_value,
            bid_due_date,
            updated_at,
            archived_at,
            customer:customers!inner ( company_name )
          `
        )
        .is("archived_at", null)
        .neq("status", "Archived")
        .order("updated_at", { ascending: false }),
      supabase
        .from("estimates")
        .select(
          `
            id,
            title,
            status,
            selling_price,
            grand_total,
            direct_cost_total,
            profit_amount,
            updated_at,
            project:projects!inner (
              id,
              status,
              project_name
            )
          `
        )
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("proposals")
        .select(
          `
            id,
            title,
            status,
            amount,
            sent_at,
            accepted_at,
            updated_at,
            project:projects!inner (
              id,
              project_name,
              status
            )
          `
        )
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("customers")
        .select("id, company_name, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("project_job_actuals").select("project_id, actual_total"),
    ]);

  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }
  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }
  if (proposalsResult.error) {
    throw new Error(proposalsResult.error.message);
  }
  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (jobActualsResult.error && !jobActualsResult.error.message.includes("project_job_actuals")) {
    throw new Error(jobActualsResult.error.message);
  }

  const projects = projectsResult.data ?? [];
  const estimates = estimatesResult.data ?? [];
  const proposals = proposalsResult.data ?? [];
  const customers = customersResult.data ?? [];
  const jobActuals = jobActualsResult.error ? [] : (jobActualsResult.data ?? []);

  const activeProjects = projects.filter(
    (project) => !["Lost", "Archived"].includes(project.status)
  ).length;

  const acceptedProposals = proposals.filter(
    (proposal) => proposal.status === "Accepted"
  );
  const declinedProposals = proposals.filter(
    (proposal) => proposal.status === "Declined"
  );
  const decidedCount = acceptedProposals.length + declinedProposals.length;

  const monthlyRevenue = acceptedProposals
    .filter(
      (proposal) =>
        proposal.accepted_at &&
        new Date(proposal.accepted_at) >= monthStart
    )
    .reduce((sum, proposal) => sum + parseNumber(proposal.amount), 0);

  const winRate = safePercent(acceptedProposals.length, decidedCount);

  const pendingProposals = proposals.filter((proposal) =>
    ["Sent", "Viewed"].includes(proposal.status)
  );

  const openProposals = pendingProposals.length;

  const marginValues = estimates
    .map((estimate) => {
      const revenue = parseNumber(estimate.selling_price ?? estimate.grand_total);
      const directCost = parseNumber(estimate.direct_cost_total);
      if (revenue <= 0) return 0;
      const profit = parseNumber(estimate.profit_amount);
      if (profit > 0) return (profit / revenue) * 100;
      return Math.max(0, ((revenue - directCost) / revenue) * 100);
    })
    .filter((value) => value > 0);

  const grossMarginPercent =
    marginValues.length > 0
      ? marginValues.reduce((sum, value) => sum + value, 0) / marginValues.length
      : 0;

  const isPortfolioEmpty =
    activeProjects === 0 &&
    estimates.length === 0 &&
    proposals.length === 0 &&
    customers.length === 0;

  const kpis: DashboardKpi[] = [
    {
      id: "monthly-revenue",
      title: "Revenue",
      value: formatCurrency(monthlyRevenue),
      icon: CircleDollarSign,
      href: "/analytics",
    },
    {
      id: "active-projects",
      title: "Active Projects",
      value: String(activeProjects),
      icon: FolderKanban,
      href: "/projects",
    },
    {
      id: "pending-proposals",
      title: "Pending Proposals",
      value: String(openProposals),
      icon: FileText,
      href: "/proposals",
    },
    {
      id: "win-rate",
      title: "Win Rate",
      value: formatPercent(winRate),
      icon: Percent,
      href: "/analytics?section=proposals",
    },
    {
      id: "gross-margin",
      title: "Gross Margin",
      value: formatPercent(grossMarginPercent),
      icon: TrendingUp,
      href: "/analytics?section=estimating",
    },
  ];

  const customerNameByProjectId = new Map(
    projects.map((project) => [
      project.id,
      normalizeCustomer(project.customer)?.company_name ?? "Customer",
    ])
  );

  const briefing = buildDashboardBriefing({
    isPortfolioEmpty,
    customerCount: customers.length,
    projects: projects.map((project) => ({
      id: project.id,
      project_name: project.project_name,
      status: project.status,
      bid_due_date: project.bid_due_date,
      updated_at: project.updated_at,
      customerName: customerNameByProjectId.get(project.id) ?? "Customer",
    })),
    estimates: estimates.map((estimate) => {
      const project = Array.isArray(estimate.project)
        ? estimate.project[0] ?? null
        : estimate.project;
      const fullProject = project
        ? projects.find((entry) => entry.id === project.id)
        : null;

      return {
        id: estimate.id,
        title: estimate.title,
        status: estimate.status,
        updated_at: estimate.updated_at,
        direct_cost_total: estimate.direct_cost_total,
        customerName: fullProject
          ? (customerNameByProjectId.get(fullProject.id) ?? "Customer")
          : "Customer",
        project: project
          ? {
              ...project,
              bid_due_date: fullProject?.bid_due_date ?? null,
            }
          : null,
      };
    }),
    proposals: proposals.map((proposal) => {
      const project = Array.isArray(proposal.project)
        ? proposal.project[0]
        : proposal.project;

      return {
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        sent_at: proposal.sent_at,
        updated_at: proposal.updated_at,
        project,
        customerName: project
          ? (customerNameByProjectId.get(project.id) ?? "Customer")
          : "Customer",
      };
    }),
    jobActuals: jobActuals.map((row) => ({
      project_id: String(row.project_id),
      actual_total: row.actual_total,
    })),
  });

  const upcomingJobs: DashboardUpcomingJob[] = projects
    .filter((project) => UPCOMING_STATUSES.has(project.status))
    .slice(0, 6)
    .map((project) => ({
      id: project.id,
      projectName: project.project_name,
      customerName: normalizeCustomer(project.customer)?.company_name ?? "Customer",
      status: project.status,
      value: parseNumber(project.estimated_value),
      timingLabel:
        project.status === "Awarded"
          ? "Ready to mobilize"
          : formatTimingLabel(project.updated_at),
      href: `/projects/${project.id}`,
    }));

  const activity: DashboardActivityItem[] = [];

  for (const customer of customers.slice(0, 8)) {
    activity.push({
      id: `customer-${customer.id}`,
      type: "customer",
      action: "Customer added",
      title: customer.company_name,
      subtitle: "New customer record",
      timestamp: customer.created_at,
      href: "/customers",
    });
  }

  for (const project of projects.slice(0, 10)) {
    activity.push({
      id: `project-${project.id}`,
      type: "project",
      action: "Project updated",
      title: project.project_name,
      subtitle: normalizeCustomer(project.customer)?.company_name ?? "Project",
      timestamp: project.updated_at,
      href: `/projects/${project.id}`,
    });
  }

  for (const estimate of estimates.slice(0, 10)) {
    const project = Array.isArray(estimate.project)
      ? estimate.project[0]
      : estimate.project;
    activity.push({
      id: `estimate-${estimate.id}`,
      type: "estimate",
      action: estimate.status === "Draft" ? "Estimate drafted" : "Estimate updated",
      title: estimate.title,
      subtitle: project?.project_name ?? "Project",
      timestamp: estimate.updated_at,
      href: `/estimates/${estimate.id}`,
    });
  }

  for (const proposal of proposals.slice(0, 10)) {
    const project = Array.isArray(proposal.project)
      ? proposal.project[0]
      : proposal.project;
    const action =
      proposal.status === "Accepted"
        ? "Proposal accepted"
        : proposal.status === "Declined"
          ? "Proposal declined"
          : proposal.status === "Sent" || proposal.status === "Viewed"
            ? "Proposal sent"
            : "Proposal updated";

    activity.push({
      id: `proposal-${proposal.id}`,
      type: "proposal",
      action,
      title: proposal.title,
      subtitle: project?.project_name ?? "Project",
      timestamp: proposal.updated_at,
      href: `/proposals/${proposal.id}`,
    });
  }

  const recentActivity = activity
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
    .slice(0, 6);

  const primaryAction = resolveDashboardPrimaryAction({
    isPortfolioEmpty,
    customerCount: customers.length,
    projectCount: projects.length,
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      status: estimate.status,
      updated_at: estimate.updated_at,
    })),
    proposals: proposals.map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      sent_at: proposal.sent_at,
      title: proposal.title,
    })),
  });

  return {
    isPortfolioEmpty,
    primaryAction,
    kpis,
    priorities: briefing.priorities,
    hasRisk: briefing.hasRisk,
    continueWorking: briefing.continueWorking,
    upcomingJobs,
    recentActivity,
  };
}

export function isPortfolioEmpty(
  stats: Awaited<ReturnType<typeof getProjectStats>>
) {
  return (
    stats.activeProjects === 0 &&
    stats.draftEstimates === 0 &&
    stats.proposalsSent === 0 &&
    stats.estimatedRevenue === 0
  );
}

/** @deprecated Use getDashboardOverview */
export async function getDashboardStats() {
  const stats = await getProjectStats();

  return {
    isPortfolioEmpty: isPortfolioEmpty(stats),
    items: [
      {
        title: "Active Projects",
        value: String(stats.activeProjects),
        change: `${stats.estimatingProjects} in estimating`,
        changeType: "neutral" as const,
        icon: FolderKanban,
      },
      {
        title: "Draft Estimates",
        value: String(stats.draftEstimates),
        change: "Across your portfolio",
        changeType: "neutral" as const,
        icon: PencilLine,
      },
      {
        title: "Proposals Sent",
        value: String(stats.proposalsSent),
        change: `${stats.awardedProjects} awarded`,
        changeType: stats.proposalsSent > 0 ? ("positive" as const) : ("neutral" as const),
        icon: FileText,
      },
      {
        title: "Estimated Revenue",
        value: formatCurrency(stats.estimatedRevenue),
        change: "Active pipeline value",
        changeType: "positive" as const,
        icon: DollarSign,
      },
      {
        title: "Average Project Margin",
        value: formatPercent(stats.averageMargin),
        change: "From saved estimates",
        changeType: stats.averageMargin >= 10 ? ("positive" as const) : ("neutral" as const),
        icon: Percent,
      },
    ],
  };
}
