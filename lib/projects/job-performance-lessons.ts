import type { ProjectBudgetSummary, ProjectKpiSummary } from "@/lib/projects/profile-types";
import type { ProjectFieldData } from "@/lib/projects/job-costing-types";

export type JobPerformanceLesson = {
  id: string;
  label: string;
};

type BuildJobPerformanceLessonsInput = {
  budget: ProjectBudgetSummary;
  field: ProjectFieldData;
  kpis: ProjectKpiSummary;
};

/** Short lessons derived from job costing data for the analytics handoff. */
export function buildJobPerformanceLessons(
  input: BuildJobPerformanceLessonsInput
): JobPerformanceLesson[] {
  const lessons: JobPerformanceLesson[] = [];
  const { budget, field, kpis } = input;

  if (budget.variancePercent > 5) {
    lessons.push({
      id: "cost-overrun",
      label: `Actual costs ran ${Math.abs(budget.variancePercent).toFixed(0)}% over estimate — review category breakdown before the next bid.`,
    });
  } else if (budget.variancePercent < -5) {
    lessons.push({
      id: "cost-under",
      label: `Job came in ${Math.abs(budget.variancePercent).toFixed(0)}% under estimate — consider whether padding can come down on similar work.`,
    });
  }

  const laborCategory = budget.categories.find((item) => item.key === "labor");
  if (laborCategory?.isOverBudget) {
    lessons.push({
      id: "labor-over",
      label: "Labor exceeded estimate — check crew size, productivity, and overtime on future bids.",
    });
  }

  const materialsCategory = budget.categories.find((item) => item.key === "materials");
  if (materialsCategory?.isOverBudget) {
    lessons.push({
      id: "materials-over",
      label: "Materials ran over — verify buyout timing, waste factors, and vendor pricing assumptions.",
    });
  }

  if (
    field.estimatedLaborHours > 0 &&
    field.totalLogHours > field.estimatedLaborHours * 1.1
  ) {
    lessons.push({
      id: "hours-over",
      label: "Field hours exceeded labor estimate — adjust production rates on similar scopes.",
    });
  }

  if (kpis.grossMarginPercent > 0 && kpis.grossMarginPercent < 10) {
    lessons.push({
      id: "thin-margin",
      label: `${kpis.grossMarginPercent.toFixed(1)}% gross margin is thin — protect markup on the next comparable bid.`,
    });
  }

  if (field.pendingChangeOrderCount > 0) {
    lessons.push({
      id: "open-cos",
      label: `${field.pendingChangeOrderCount} change order${field.pendingChangeOrderCount === 1 ? "" : "s"} still pending — close these out before finalizing job performance.`,
    });
  }

  if (lessons.length === 0) {
    lessons.push({
      id: "on-track",
      label: "Job tracked close to estimate — compare category trends in analytics to validate your pricing assumptions.",
    });
  }

  return lessons.slice(0, 3);
}
