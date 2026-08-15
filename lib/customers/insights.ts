import type {
  CustomerAiInsight,
  CustomerProfile,
  CustomerStatus,
} from "@/lib/customers/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildCustomerAiInsights(profile: CustomerProfile): CustomerAiInsight[] {
  const insights: CustomerAiInsight[] = [];
  const { summary, customer, projects } = profile;
  const openProposals = profile.openProposals.length;
  const openEstimates = profile.openEstimates.length;
  const daysSinceActivity = summary.lastActivityAt
    ? Math.floor(
        (Date.now() - new Date(summary.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  if (daysSinceActivity !== null && daysSinceActivity >= 30) {
    insights.push({
      id: "follow-up",
      tone: "warning",
      title: "Needs follow-up",
      description: `No activity in ${daysSinceActivity} days. Reach out to stay top of mind.`,
      actionLabel: "Add note",
      href: `/customers/${customer.id}#notes`,
    });
  } else if (openProposals > 0) {
    insights.push({
      id: "open-proposals",
      tone: "info",
      title: `${openProposals} open proposal${openProposals === 1 ? "" : "s"}`,
      description: "Follow up on sent proposals while scope is fresh.",
      actionLabel: "View proposals",
      href: `/proposals?customer=${customer.id}`,
    });
  }

  if (summary.totalRevenue >= 25000) {
    insights.push({
      id: "high-value",
      tone: "success",
      title: "High-value customer",
      description: `${formatCurrency(summary.totalRevenue)} in tracked revenue — protect the relationship.`,
      actionLabel: "View analytics",
      href: `/analytics?section=customers&customer=${customer.id}`,
    });
  }

  const activeProjects = projects.filter(
    (project) => !["Lost", "Archived"].includes(project.status)
  ).length;

  if (activeProjects > 1) {
    insights.push({
      id: "repeat-opportunity",
      tone: "opportunity",
      title: "Repeat customer opportunity",
      description: `${activeProjects} active projects — strong fit for bundled or follow-on work.`,
      actionLabel: "View projects",
      href: `/projects?customer=${customer.id}`,
    });
  }

  if (summary.openContractValue > 0) {
    insights.push({
      id: "open-contract-value",
      tone: "info",
      title: "Open contract value",
      description: `${formatCurrency(summary.openContractValue)} in accepted work on active projects.`,
      actionLabel: "Review proposals",
      href: `/proposals?customer=${customer.id}`,
    });
  } else if (customer.status === "lead" && openEstimates === 0) {
    insights.push({
      id: "create-estimate",
      tone: "info",
      title: "Suggested next action",
      description: "Convert this lead by scoping the first estimate.",
      actionLabel: "Create estimate",
      href: "/estimates",
    });
  } else if (openEstimates > 0) {
    insights.push({
      id: "finalize-estimate",
      tone: "info",
      title: "Suggested next action",
      description: `${openEstimates} open estimate${openEstimates === 1 ? "" : "s"} ready for review or proposal.`,
      actionLabel: "Review estimates",
      href: `/estimates?customer=${customer.id}`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy",
      tone: "success",
      title: "Relationship looks healthy",
      description: "Keep notes and documents updated as work progresses.",
      actionLabel: "Add note",
      href: `/customers/${customer.id}#notes`,
    });
  }

  return insights.slice(0, 4);
}

export function customerStatusLabel(status: CustomerStatus) {
  switch (status) {
    case "lead":
      return "Lead";
    case "prospect":
      return "Prospect";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function customerStatusStyles(status: CustomerStatus) {
  switch (status) {
    case "lead":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "prospect":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "active":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "completed":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
