import "server-only";

import {
  buildProjectBudgetSummary,
  buildProjectTimeline,
  mapEstimateRows,
} from "@/lib/projects/budget";
import { parseNumber } from "@/lib/projects/format";
import {
  buildProjectFieldData,
  getProjectChangeOrders,
  getProjectJobLogs,
} from "@/lib/projects/job-costing-queries";
import type {
  ProjectKpiSummary,
  ProjectListMetrics,
  ProjectProfile,
} from "@/lib/projects/profile-types";
import {
  bidDueUrgency,
  daysUntil,
  progressFromStatus,
} from "@/lib/projects/profile-types";
import { getProjectById } from "@/lib/projects/queries";
import type { ProjectStatus, ProjectWithCustomer } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

function buildKpis(
  project: ProjectWithCustomer,
  estimates: ReturnType<typeof mapEstimateRows>,
  budgetUsedPercent: number
): ProjectKpiSummary {
  const primaryEstimate =
    estimates.find((estimate) => estimate.status === "Final") ?? estimates[0];

  const contractValue =
    parseNumber(project.estimated_value) > 0
      ? parseNumber(project.estimated_value)
      : (primaryEstimate?.total ?? 0);

  const estimatedProfit = primaryEstimate?.profit_amount ?? 0;
  const grossMarginPercent = primaryEstimate?.gross_margin_percent ?? 0;

  let progressPercent = progressFromStatus(project.status);
  if (project.status === "Awarded" && budgetUsedPercent > 0) {
    progressPercent = Math.min(95, Math.max(progressPercent, budgetUsedPercent * 0.85));
  }

  const daysRemaining = daysUntil(project.bid_due_date);
  let daysRemainingLabel = "—";

  if (daysRemaining !== null && ["Lead", "Estimating", "Proposal Sent"].includes(project.status)) {
    if (daysRemaining < 0) {
      daysRemainingLabel = `${Math.abs(daysRemaining)} days overdue`;
    } else if (daysRemaining === 0) {
      daysRemainingLabel = "Due today";
    } else {
      daysRemainingLabel = `${daysRemaining} days remaining`;
    }
  } else if (project.status === "Awarded") {
    daysRemainingLabel = "In progress";
  }

  return {
    contractValue,
    estimatedProfit,
    grossMarginPercent,
    progressPercent,
    budgetUsedPercent,
    daysRemaining,
    daysRemainingLabel,
  };
}

export async function getProjectProfile(projectId: string): Promise<ProjectProfile | null> {
  const project = await getProjectById(projectId);

  if (!project) {
    return null;
  }

  const supabase = await createClient();

  const [estimatesResult, proposalsResult, actualsResult, changeOrders, jobLogs] =
    await Promise.all([
    supabase
      .from("estimates")
      .select(
        `
          id, title, status, selling_price, grand_total, profit_amount,
          gross_margin_percent, profit_margin_percent, direct_cost_total, updated_at,
          line_items:estimate_line_items ( category, quantity, unit_cost )
        `
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("proposals")
      .select(
        "id, title, status, amount, sent_at, accepted_at, first_viewed_at, updated_at"
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_job_actuals")
      .select(
        "actual_labor, actual_materials, actual_equipment, actual_subcontractors, actual_miscellaneous, actual_total, change_order_count, recorded_at"
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    getProjectChangeOrders(projectId),
    getProjectJobLogs(projectId),
  ]);

  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }

  const lineItemsByEstimate = new Map<
    string,
    Array<{ category: string; quantity: number; unit_cost: number }>
  >();

  for (const estimate of estimatesResult.data ?? []) {
    const items = Array.isArray(estimate.line_items) ? estimate.line_items : [];
    lineItemsByEstimate.set(estimate.id, items);
  }

  const estimates = mapEstimateRows(estimatesResult.data ?? [], lineItemsByEstimate);

  const proposals = (proposalsResult.data ?? []).map((proposal) => ({
    id: proposal.id,
    title: proposal.title,
    status: proposal.status,
    amount: parseNumber(proposal.amount),
    sent_at: proposal.sent_at,
    accepted_at: proposal.accepted_at,
    first_viewed_at: proposal.first_viewed_at,
    updated_at: proposal.updated_at,
  }));

  const actuals = actualsResult.error ? null : actualsResult.data;
  const jobActuals = actuals
    ? {
        actual_labor: parseNumber(actuals.actual_labor),
        actual_materials: parseNumber(actuals.actual_materials),
        actual_equipment: parseNumber(actuals.actual_equipment),
        actual_subcontractors: parseNumber(actuals.actual_subcontractors),
        actual_miscellaneous: parseNumber(actuals.actual_miscellaneous),
        actual_total: parseNumber(actuals.actual_total),
        change_order_count: parseNumber(actuals.change_order_count),
        recorded_at: actuals.recorded_at,
      }
    : null;

  const budget = buildProjectBudgetSummary(estimates, jobActuals);

  const primaryEstimate =
    estimates.find((estimate) => estimate.status === "Final") ?? estimates[0];
  const primaryLineItems =
    lineItemsByEstimate.get(primaryEstimate?.id ?? "") ?? [];
  const estimatedLaborHours = primaryLineItems
    .filter((item) => item.category === "labor")
    .reduce((sum, item) => sum + parseNumber(item.quantity), 0);

  const field = buildProjectFieldData(changeOrders, jobLogs, estimatedLaborHours);

  let mediaCount = 0;
  const proposalIds = proposals.map((proposal) => proposal.id);

  if (proposalIds.length > 0) {
    const mediaResult = await supabase
      .from("proposal_media")
      .select("id", { count: "exact", head: true })
      .in("proposal_id", proposalIds);

    mediaCount = mediaResult.count ?? 0;
  }

  return {
    projectId,
    kpis: buildKpis(project, estimates, budget.budgetUsedPercent),
    budget,
    timeline: buildProjectTimeline({
      project,
      estimates,
      proposals,
      mediaCount,
      changeOrders,
      jobLogs,
    }),
    estimates,
    proposals,
    field,
    jobActuals,
  };
}

export async function getProjectsListMetrics(
  projects: ProjectWithCustomer[]
): Promise<Record<string, ProjectListMetrics>> {
  if (projects.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const projectIds = projects.map((project) => project.id);

  const [estimatesResult, proposalsResult] = await Promise.all([
    supabase
      .from("estimates")
      .select("project_id")
      .in("project_id", projectIds),
    supabase
      .from("proposals")
      .select("project_id")
      .in("project_id", projectIds),
  ]);

  const estimateCounts = new Map<string, number>();
  const proposalCounts = new Map<string, number>();

  for (const estimate of estimatesResult.data ?? []) {
    estimateCounts.set(
      estimate.project_id,
      (estimateCounts.get(estimate.project_id) ?? 0) + 1
    );
  }

  for (const proposal of proposalsResult.data ?? []) {
    proposalCounts.set(
      proposal.project_id,
      (proposalCounts.get(proposal.project_id) ?? 0) + 1
    );
  }

  const metrics: Record<string, ProjectListMetrics> = {};

  for (const project of projects) {
    metrics[project.id] = {
      progressPercent: progressFromStatus(project.status as ProjectStatus),
      estimateCount: estimateCounts.get(project.id) ?? 0,
      proposalCount: proposalCounts.get(project.id) ?? 0,
      bidDueUrgency: bidDueUrgency(project.bid_due_date, project.status),
    };
  }

  return metrics;
}
