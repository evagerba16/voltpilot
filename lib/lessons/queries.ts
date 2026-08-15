import "server-only";

import { buildProjectBudgetSummary, mapEstimateRows } from "@/lib/projects/budget";
import { parseNumber } from "@/lib/projects/format";
import { buildProjectFieldData } from "@/lib/projects/job-costing-queries";
import type { CompletedJobRecord, EstimateGuidanceContext } from "@/lib/lessons/types";
import { buildEstimateGuidance } from "@/lib/lessons/lessons-engine";
import { createClient } from "@/lib/supabase/server";

const MIN_ACTUAL_TOTAL = 1;

/** Load completed jobs with estimate vs. actual data for the lessons engine. */
export async function getCompletedJobsForLessons(
  excludeProjectId?: string
): Promise<CompletedJobRecord[]> {
  const supabase = await createClient();

  const { data: actualsRows, error: actualsError } = await supabase
    .from("project_job_actuals")
    .select(
      `
        project_id,
        actual_labor,
        actual_materials,
        actual_equipment,
        actual_subcontractors,
        actual_miscellaneous,
        actual_total,
        change_order_count
      `
    )
    .gt("actual_total", MIN_ACTUAL_TOTAL);

  if (actualsError) {
    if (actualsError.message.includes("project_job_actuals")) {
      return [];
    }
    throw new Error(actualsError.message);
  }

  const actuals = (actualsRows ?? []).filter(
    (row) => row.project_id && row.project_id !== excludeProjectId
  );

  if (actuals.length === 0) {
    return [];
  }

  const projectIds = [...new Set(actuals.map((row) => String(row.project_id)))];

  const [projectsResult, estimatesResult, jobLogsResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
          id,
          project_name,
          project_type,
          customer_id,
          customer:customers!inner ( id, company_name )
        `
      )
      .in("id", projectIds)
      .is("archived_at", null),
    supabase
      .from("estimates")
      .select(
        `
          id, project_id, title, status, selling_price, grand_total, profit_amount,
          gross_margin_percent, profit_margin_percent, direct_cost_total, updated_at,
          labor_total, materials_total, equipment_total, subcontractors_total, miscellaneous_total,
          line_items:estimate_line_items ( category, quantity, unit_cost )
        `
      )
      .in("project_id", projectIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_job_logs")
      .select("project_id, hours_worked")
      .in("project_id", projectIds),
  ]);

  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }

  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }

  const projectsById = new Map(
    (projectsResult.data ?? []).map((project) => {
      const customer = Array.isArray(project.customer)
        ? project.customer[0]
        : project.customer;

      return [
        String(project.id),
        {
          projectName: String(project.project_name),
          projectType: String(project.project_type ?? "Other"),
          customerId: String(project.customer_id),
          customerName: String(customer?.company_name ?? "Unknown customer"),
        },
      ];
    })
  );

  const estimatesByProject = new Map<string, typeof estimatesResult.data>();
  for (const estimate of estimatesResult.data ?? []) {
    const projectId = String(estimate.project_id);
    const list = estimatesByProject.get(projectId) ?? [];
    list.push(estimate);
    estimatesByProject.set(projectId, list);
  }

  const logHoursByProject = new Map<string, number>();
  for (const log of jobLogsResult.data ?? []) {
    const projectId = String(log.project_id);
    logHoursByProject.set(
      projectId,
      (logHoursByProject.get(projectId) ?? 0) + parseNumber(log.hours_worked)
    );
  }

  const records: CompletedJobRecord[] = [];

  for (const actualsRow of actuals) {
    const projectId = String(actualsRow.project_id);
    const project = projectsById.get(projectId);

    if (!project) {
      continue;
    }

    const projectEstimates = estimatesByProject.get(projectId) ?? [];

    if (projectEstimates.length === 0) {
      continue;
    }

    const lineItemsByEstimate = new Map<
      string,
      Array<{ category: string; quantity: number; unit_cost: number }>
    >();

    for (const estimate of projectEstimates) {
      const items = Array.isArray(estimate.line_items) ? estimate.line_items : [];
      lineItemsByEstimate.set(String(estimate.id), items);
    }

    const estimates = mapEstimateRows(projectEstimates, lineItemsByEstimate);
    const jobActuals = {
      actual_labor: parseNumber(actualsRow.actual_labor),
      actual_materials: parseNumber(actualsRow.actual_materials),
      actual_equipment: parseNumber(actualsRow.actual_equipment),
      actual_subcontractors: parseNumber(actualsRow.actual_subcontractors),
      actual_miscellaneous: parseNumber(actualsRow.actual_miscellaneous),
      actual_total: parseNumber(actualsRow.actual_total),
      change_order_count: parseNumber(actualsRow.change_order_count),
      recorded_at: new Date().toISOString(),
    };

    const budget = buildProjectBudgetSummary(estimates, jobActuals);
    const primaryEstimate =
      estimates.find((estimate) => estimate.status === "Final") ?? estimates[0];

    const primaryLineItems = lineItemsByEstimate.get(primaryEstimate?.id ?? "") ?? [];
    const estimatedLaborHours = primaryLineItems
      .filter((item) => item.category === "labor")
      .reduce((sum, item) => sum + parseNumber(item.quantity), 0);

    const field = buildProjectFieldData([], [], estimatedLaborHours);
    const totalLogHours = logHoursByProject.get(projectId) ?? field.totalLogHours;

    records.push({
      projectId,
      projectName: project.projectName,
      projectType: project.projectType,
      customerId: project.customerId,
      customerName: project.customerName,
      budget: {
        estimatedTotal: budget.estimatedTotal,
        actualTotal: budget.actualTotal,
        variancePercent: budget.variancePercent,
        categories: budget.categories.map((category) => ({
          key: category.key,
          label: category.label,
          estimated: category.estimated,
          actual: category.actual,
          variancePercent: category.variancePercent,
        })),
      },
      changeOrderCount: jobActuals.change_order_count,
      grossMarginPercent: primaryEstimate?.gross_margin_percent ?? 0,
      totalLogHours,
      estimatedLaborHours,
    });
  }

  return records;
}

export async function getEstimateGuidance(context: EstimateGuidanceContext) {
  const completedJobs = await getCompletedJobsForLessons(context.projectId);
  return buildEstimateGuidance(completedJobs, context);
}
