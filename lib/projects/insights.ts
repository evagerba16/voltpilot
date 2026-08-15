import type { ProjectFieldData } from "@/lib/projects/job-costing-types";
import type { ProjectBudgetSummary, ProjectKpiSummary } from "@/lib/projects/profile-types";
import type { ProjectInsight } from "@/lib/ai/types";
import type { ProjectWithCustomer } from "@/lib/projects/types";
import { daysUntil } from "@/lib/projects/profile-types";

export type ProjectInsightWithAction = ProjectInsight & {
  href?: string;
  actionLabel?: string;
};

function projectJobCostingHref(projectId: string, hash?: string) {
  const base = `/projects/${projectId}?tab=job-costing`;
  return hash ? `${base}#${hash}` : base;
}

export function buildProfileInsights({
  project,
  kpis,
  budget,
  field,
  estimateCount,
  proposalCount,
}: {
  project: ProjectWithCustomer;
  kpis: ProjectKpiSummary;
  budget: ProjectBudgetSummary;
  field: ProjectFieldData;
  estimateCount: number;
  proposalCount: number;
}): ProjectInsightWithAction[] {
  const insights: ProjectInsightWithAction[] = [];
  const projectHref = `/projects/${project.id}`;

  if (budget.budgetUsedPercent > 100) {
    insights.push({
      id: "budget-overrun",
      category: "cost_risk",
      severity: "critical",
      title: "Budget overrun detected",
      description: `Actual costs are ${budget.budgetUsedPercent.toFixed(0)}% of the estimate — review labor productivity and buyout before billing.`,
      href: projectJobCostingHref(project.id),
      actionLabel: "Review job costing",
    });
  } else if (budget.budgetUsedPercent > 85 && budget.hasActuals) {
    insights.push({
      id: "budget-tight",
      category: "cost_risk",
      severity: "warning",
      title: "Budget is tightening",
      description: `${budget.budgetUsedPercent.toFixed(0)}% of estimated cost is consumed with work still in progress. ${formatCurrency(budget.remainingBudget)} remaining.`,
      href: projectJobCostingHref(project.id),
      actionLabel: "Review job costing",
    });
  }

  const materialsCategory = budget.categories.find((item) => item.key === "materials");
  if (materialsCategory?.isOverBudget) {
    insights.push({
      id: "material-overspend",
      category: "cost_risk",
      severity: "warning",
      title: "Material overspending",
      description: `Materials are ${Math.abs(materialsCategory.variancePercent).toFixed(0)}% over estimate — verify buyout, waste, and change order billing.`,
      href: projectJobCostingHref(project.id),
      actionLabel: "Review materials",
    });
  }

  if (
    field.estimatedLaborHours > 0 &&
    field.totalLogHours > field.estimatedLaborHours * 1.15 &&
    project.status === "Awarded"
  ) {
    const efficiency = (field.estimatedLaborHours / field.totalLogHours) * 100;
    insights.push({
      id: "labor-efficiency",
      category: "cost_risk",
      severity: "warning",
      title: "Labor efficiency below target",
      description: `${field.totalLogHours.toFixed(0)} field hours logged vs ${field.estimatedLaborHours.toFixed(0)} estimated (${efficiency.toFixed(0)}% efficiency). Review crew size and productivity.`,
      href: projectJobCostingHref(project.id, "job-logs"),
      actionLabel: "Review daily logs",
    });
  } else if (
    field.estimatedLaborHours > 0 &&
    field.totalLogHours > 0 &&
    field.totalLogHours < field.estimatedLaborHours * 0.5 &&
    project.status === "Awarded" &&
    kpis.progressPercent > 60
  ) {
    insights.push({
      id: "labor-underlogged",
      category: "action",
      severity: "info",
      title: "Field hours may be under-reported",
      description: `Only ${field.totalLogHours.toFixed(0)} of ${field.estimatedLaborHours.toFixed(0)} estimated labor hours are logged — capture daily logs for accurate job costing.`,
      href: projectJobCostingHref(project.id, "job-logs"),
      actionLabel: "Add daily log",
    });
  }

  const days = daysUntil(project.bid_due_date);
  if (
    days !== null &&
    days < 0 &&
    ["Lead", "Estimating", "Proposal Sent"].includes(project.status)
  ) {
    insights.push({
      id: "bid-overdue",
      category: "action",
      severity: "critical",
      title: "Bid deadline passed",
      description: `Bid due date was ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Confirm extension or update project status.`,
      href: `${projectHref}/edit`,
      actionLabel: "Update project",
    });
  } else if (days !== null && days <= 3 && project.status === "Estimating") {
    insights.push({
      id: "bid-soon",
      category: "action",
      severity: "warning",
      title: "Bid due soon",
      description: `Only ${days} day${days === 1 ? "" : "s"} until bid due — finalize estimate and proposal.`,
      href: estimateCount > 0 ? `/estimates` : projectHref,
      actionLabel: "Take action",
    });
  }

  if (
    project.status === "Awarded" &&
    field.daysSinceLastLog !== null &&
    field.daysSinceLastLog > 3
  ) {
    insights.push({
      id: "delayed-field-reporting",
      category: "action",
      severity: "warning",
      title: "Delayed field reporting",
      description: `No daily log in ${field.daysSinceLastLog} days — capture crew hours and progress to keep job costing current.`,
      href: projectJobCostingHref(project.id, "job-logs"),
      actionLabel: "Add daily log",
    });
  }

  if (field.pendingChangeOrderCount > 0) {
    insights.push({
      id: "pending-change-orders",
      category: "action",
      severity: "info",
      title: "Change orders awaiting approval",
      description: `${field.pendingChangeOrderCount} change order${field.pendingChangeOrderCount === 1 ? "" : "s"} pending — approve to update contract value and budget.`,
      href: projectJobCostingHref(project.id, "change-orders"),
      actionLabel: "Review change orders",
    });
  }

  const riskSignals = [
    budget.budgetUsedPercent > 100,
    budget.budgetUsedPercent > 90 && budget.hasActuals,
    kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 8,
    field.daysSinceLastLog !== null && field.daysSinceLastLog > 5 && project.status === "Awarded",
    days !== null && days < 0 && project.status !== "Awarded",
  ].filter(Boolean).length;

  if (riskSignals >= 2) {
    insights.push({
      id: "project-at-risk",
      category: "cost_risk",
      severity: "critical",
      title: "Project at risk",
      description: "Multiple cost, schedule, or field signals flagged — prioritize a project review with your PM and estimator.",
      href: projectJobCostingHref(project.id),
      actionLabel: "Open job costing",
    });
  }

  if (kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 10) {
    insights.push({
      id: "low-margin",
      category: "profitability",
      severity: "warning",
      title: "Thin margin on this project",
      description: `${kpis.grossMarginPercent.toFixed(1)}% gross margin leaves little room for RFIs and field variance.`,
      href: estimateCount > 0 ? projectHref : undefined,
      actionLabel: "Review estimate",
    });
  }

  if (estimateCount === 0) {
    insights.push({
      id: "no-estimates",
      category: "action",
      severity: "warning",
      title: "No estimates linked",
      description: "Create an estimate to quantify scope, labor, and materials for this project.",
      href: projectHref,
      actionLabel: "Add estimate",
    });
  }

  if (project.status === "Estimating" && estimateCount > 0 && proposalCount === 0) {
    insights.push({
      id: "ready-proposal",
      category: "action",
      severity: "info",
      title: "Ready for proposal",
      description: "Estimate data is in place — generate a proposal to send to the customer.",
      href: projectHref,
      actionLabel: "Create proposal",
    });
  }

  if (project.status === "Proposal Sent" && proposalCount > 0) {
    insights.push({
      id: "follow-up",
      category: "action",
      severity: "info",
      title: "Follow up on open proposal",
      description: "Proposal is out — schedule a follow-up call with the customer this week.",
      href: `/proposals`,
      actionLabel: "View proposals",
    });
  }

  for (const category of budget.categories.filter(
    (item) => item.isOverBudget && item.key !== "materials"
  )) {
    insights.push({
      id: `over-${category.key}`,
      category: "cost_risk",
      severity: "warning",
      title: `${category.label} over budget`,
      description: `${category.label} actuals exceed estimate by ${Math.abs(category.variancePercent).toFixed(0)}%.`,
      href: projectJobCostingHref(project.id),
      actionLabel: "Review job costing",
    });
  }

  return insights.slice(0, 8);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
