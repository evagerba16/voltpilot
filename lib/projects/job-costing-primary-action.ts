import type { LucideIcon } from "lucide-react";
import { BarChart3, HardHat, Pencil } from "lucide-react";

import { buildAnalyticsUrl } from "@/lib/analytics/url";
import type { ProjectBudgetSummary, ProjectKpiSummary } from "@/lib/projects/profile-types";
import type { ProjectFieldData } from "@/lib/projects/job-costing-types";

export type JobCostingPrimaryActionKind =
  | "start_costing"
  | "update_costs"
  | "review_performance";

export type JobCostingPrimaryAction = {
  label: string;
  kind: JobCostingPrimaryActionKind;
  icon: LucideIcon;
  context: string;
  href: string | null;
};

type JobPerformanceReadinessInput = {
  budget: ProjectBudgetSummary;
  field: ProjectFieldData;
  kpis: ProjectKpiSummary;
};

/** Job has enough actuals to review estimate vs. performance in analytics. */
export function isJobReadyForPerformanceReview(input: JobPerformanceReadinessInput): boolean {
  if (!input.budget.hasActuals) {
    return false;
  }

  const laborLogged =
    input.field.estimatedLaborHours > 0 &&
    input.field.totalLogHours >= input.field.estimatedLaborHours * 0.5;

  return (
    input.budget.budgetUsedPercent >= 50 ||
    input.kpis.progressPercent >= 80 ||
    laborLogged
  );
}

type ResolveJobCostingPrimaryActionInput = JobPerformanceReadinessInput & {
  projectId: string;
  customerId: string;
};

export function resolveJobCostingPrimaryAction(
  input: ResolveJobCostingPrimaryActionInput
): JobCostingPrimaryAction {
  if (isJobReadyForPerformanceReview(input)) {
    return {
      label: "Review job performance",
      kind: "review_performance",
      icon: BarChart3,
      context: "Compare estimate vs. actuals and capture lessons for the next bid.",
      href: buildAnalyticsUrl({
        project: input.projectId,
        customer: input.customerId,
        section: "estimating",
        range: "all",
      }),
    };
  }

  if (input.budget.hasActuals) {
    return {
      label: "Update job costs",
      kind: "update_costs",
      icon: Pencil,
      context: "Keep actuals current as field work progresses.",
      href: null,
    };
  }

  return {
    label: "Start job costing",
    kind: "start_costing",
    icon: HardHat,
    context: "Track actual costs against the accepted bid.",
    href: null,
  };
}
