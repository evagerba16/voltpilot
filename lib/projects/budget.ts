import { parseNumber } from "@/lib/projects/format";
import type { ProjectChangeOrder, ProjectJobLog } from "@/lib/projects/job-costing-types";
import type {
  ProjectBudgetCategory,
  ProjectBudgetSummary,
  ProjectEstimateDetail,
  ProjectJobActuals,
  ProjectProposalSummary,
  ProjectTimelineEvent,
} from "@/lib/projects/profile-types";
import type { ProjectWithCustomer } from "@/lib/projects/types";

type EstimateLineItemRow = {
  category: string;
  quantity: number;
  unit_cost: number;
};

function sumCategory(items: EstimateLineItemRow[], category: string) {
  return items
    .filter((item) => item.category === category)
    .reduce((sum, item) => sum + parseNumber(item.quantity) * parseNumber(item.unit_cost), 0);
}

export function buildProjectBudgetSummary(
  estimates: ProjectEstimateDetail[],
  actuals: ProjectJobActuals | null
): ProjectBudgetSummary {
  const sourceEstimate =
    estimates.find((estimate) => estimate.status === "Final") ?? estimates[0] ?? null;

  const estimatedCategories = {
    labor: sourceEstimate?.labor_total ?? 0,
    materials: sourceEstimate?.materials_total ?? 0,
    equipment: sourceEstimate?.equipment_total ?? 0,
    subcontractors: sourceEstimate?.subcontractors_total ?? 0,
    miscellaneous: sourceEstimate?.miscellaneous_total ?? 0,
  };

  const estimatedTotal =
    sourceEstimate?.direct_cost_total ??
    Object.values(estimatedCategories).reduce((sum, value) => sum + value, 0);

  const actualCategories = {
    labor: actuals?.actual_labor ?? 0,
    materials: actuals?.actual_materials ?? 0,
    equipment: actuals?.actual_equipment ?? 0,
    subcontractors: actuals?.actual_subcontractors ?? 0,
    miscellaneous: actuals?.actual_miscellaneous ?? 0,
  };

  const actualTotal =
    actuals?.actual_total ??
    Object.values(actualCategories).reduce((sum, value) => sum + value, 0);

  const categoryDefs: Array<{
    key: ProjectBudgetCategory["key"];
    label: string;
  }> = [
    { key: "labor", label: "Labor" },
    { key: "materials", label: "Materials" },
    { key: "equipment", label: "Equipment" },
    { key: "subcontractors", label: "Subcontractors" },
    { key: "miscellaneous", label: "Miscellaneous" },
  ];

  const categories: ProjectBudgetCategory[] = categoryDefs.map(({ key, label }) => {
    const estimated = estimatedCategories[key];
    const actual = actualCategories[key];
    const variance = actual - estimated;
    const variancePercent =
      estimated > 0 ? (variance / estimated) * 100 : actual > 0 ? 100 : 0;

    return {
      key,
      label,
      estimated,
      actual,
      variance,
      variancePercent,
      isOverBudget: actual > estimated && (estimated > 0 || actual > 0),
    };
  });

  const variance = actualTotal - estimatedTotal;
  const variancePercent =
    estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : actualTotal > 0 ? 100 : 0;

  return {
    estimatedTotal,
    actualTotal,
    variance,
    variancePercent,
    budgetUsedPercent:
      estimatedTotal > 0 ? Math.min(150, (actualTotal / estimatedTotal) * 100) : 0,
    remainingBudget: Math.max(0, estimatedTotal - actualTotal),
    changeOrderCount: actuals?.change_order_count ?? 0,
    categories,
    hasActuals: Boolean(actuals && actualTotal > 0),
    sourceEstimateTitle: sourceEstimate?.title ?? null,
  };
}

export function buildProjectTimeline({
  project,
  estimates,
  proposals,
  mediaCount = 0,
  changeOrders = [],
  jobLogs = [],
}: {
  project: ProjectWithCustomer;
  estimates: ProjectEstimateDetail[];
  proposals: ProjectProposalSummary[];
  mediaCount?: number;
  changeOrders?: ProjectChangeOrder[];
  jobLogs?: ProjectJobLog[];
}): ProjectTimelineEvent[] {
  const events: ProjectTimelineEvent[] = [
    {
      id: `created-${project.id}`,
      type: "project_created",
      title: "Project created",
      description: `${project.project_name} was added for ${project.customer.company_name}.`,
      timestamp: project.created_at,
      href: `/projects/${project.id}`,
    },
  ];

  for (const estimate of estimates) {
    events.push({
      id: `estimate-${estimate.id}`,
      type: "estimate_created",
      title: `Estimate created: ${estimate.title}`,
      description: `${estimate.status} · ${estimate.total > 0 ? `$${estimate.total.toLocaleString()}` : "Pricing in progress"}`,
      timestamp: estimate.updated_at,
      href: `/estimates/${estimate.id}`,
    });

    if (estimate.status === "Final") {
      events.push({
        id: `estimate-final-${estimate.id}`,
        type: "estimate_finalized",
        title: `Estimate approved: ${estimate.title}`,
        description: "Estimate marked final and ready for proposal generation.",
        timestamp: estimate.updated_at,
        href: `/estimates/${estimate.id}`,
      });
    }
  }

  for (const proposal of proposals) {
    if (proposal.sent_at) {
      events.push({
        id: `proposal-sent-${proposal.id}`,
        type: "proposal_sent",
        title: `Proposal sent: ${proposal.title}`,
        description: `Sent to ${project.customer.company_name} for review.`,
        timestamp: proposal.sent_at,
        href: `/proposals/${proposal.id}`,
      });
    }

    if (proposal.first_viewed_at) {
      events.push({
        id: `proposal-viewed-${proposal.id}`,
        type: "proposal_viewed",
        title: `Proposal viewed: ${proposal.title}`,
        description: "Customer opened the proposal portal.",
        timestamp: proposal.first_viewed_at,
        href: `/proposals/${proposal.id}`,
      });
    }

    if (proposal.accepted_at) {
      events.push({
        id: `proposal-accepted-${proposal.id}`,
        type: "proposal_accepted",
        title: `Proposal accepted: ${proposal.title}`,
        description: `${formatCurrency(proposal.amount)} awarded.`,
        timestamp: proposal.accepted_at,
        href: `/proposals/${proposal.id}`,
      });
    }

    if (proposal.status === "Declined") {
      events.push({
        id: `proposal-declined-${proposal.id}`,
        type: "proposal_declined",
        title: `Proposal declined: ${proposal.title}`,
        description: "Customer declined this proposal.",
        timestamp: proposal.updated_at,
        href: `/proposals/${proposal.id}`,
      });
    }
  }

  if (project.status === "Awarded") {
    events.push({
      id: `work-started-${project.id}`,
      type: "work_started",
      title: "Work started",
      description: "Project awarded — mobilization and field work can begin.",
      timestamp: project.updated_at,
      href: `/projects/${project.id}`,
    });

    events.push({
      id: `inspection-${project.id}`,
      type: "inspection",
      title: "Inspection milestone",
      description: "Schedule rough-in, trim, and final inspections with the AHJ.",
      timestamp: project.updated_at,
    });
  }

  for (const order of changeOrders) {
    const valueLabel =
      order.value_change >= 0
        ? `+${formatCurrency(order.value_change)} contract`
        : `${formatCurrency(order.value_change)} contract`;

    events.push({
      id: `change-order-${order.id}`,
      type: "change_order",
      title:
        order.status === "approved"
          ? `Change order approved: ${order.title}`
          : `Change order: ${order.title}`,
      description: `${order.status} · ${valueLabel}${
        order.cost_impact !== 0 ? ` · ${formatCurrency(order.cost_impact)} cost impact` : ""
      }`,
      timestamp: order.approved_at ?? order.created_at,
      href: `/projects/${project.id}#change-orders`,
    });
  }

  for (const log of jobLogs) {
    events.push({
      id: `job-log-${log.id}`,
      type: "job_log",
      title: `Daily log · ${formatShortDate(log.log_date)}`,
      description: `${log.hours_worked}h logged — ${truncateText(log.work_completed, 80)}`,
      timestamp: log.created_at,
      href: `/projects/${project.id}#job-logs`,
    });
  }

  if (mediaCount > 0) {
    events.push({
      id: `files-${project.id}`,
      type: "file_uploaded",
      title: "Project files uploaded",
      description: `${mediaCount} photo${mediaCount === 1 ? "" : "s"} or attachment${mediaCount === 1 ? "" : "s"} on record.`,
      timestamp: project.updated_at,
      href: `/projects/${project.id}`,
    });
  }

  if (project.status === "Lost") {
    events.push({
      id: `completed-lost-${project.id}`,
      type: "project_completed",
      title: "Project closed",
      description: "Marked as lost — archive or revisit if scope returns.",
      timestamp: project.updated_at,
    });
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function mapEstimateRows(
  rows: Array<Record<string, unknown>>,
  lineItemsByEstimate: Map<string, EstimateLineItemRow[]>
): ProjectEstimateDetail[] {
  return rows.map((estimate) => {
    const lineItems = lineItemsByEstimate.get(String(estimate.id)) ?? [];

    return {
      id: String(estimate.id),
      title: String(estimate.title),
      status: String(estimate.status),
      total: parseNumber(estimate.selling_price ?? estimate.grand_total),
      profit_amount: parseNumber(estimate.profit_amount),
      gross_margin_percent: parseNumber(
        estimate.gross_margin_percent ?? estimate.profit_margin_percent
      ),
      direct_cost_total: parseNumber(estimate.direct_cost_total),
      labor_total: sumCategory(lineItems, "labor"),
      materials_total: sumCategory(lineItems, "materials"),
      equipment_total: sumCategory(lineItems, "equipment"),
      subcontractors_total: sumCategory(lineItems, "subcontractors"),
      miscellaneous_total: sumCategory(lineItems, "miscellaneous"),
      updated_at: String(estimate.updated_at),
    };
  });
}
