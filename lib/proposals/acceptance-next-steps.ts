import type { ProposalEstimateSnapshot } from "@/lib/proposals/types";

export type AcceptanceNextStep = {
  id: string;
  label: string;
  detail: string;
  href?: string;
};

type BuildAcceptanceNextStepsInput = {
  projectId: string;
  projectType: string;
  hasGeneralContractor: boolean;
  estimateSnapshot: ProposalEstimateSnapshot | null;
  grossMarginPercent: number | null;
};

/** Rule-based recommended next steps for a newly awarded job. */
export function buildAcceptanceNextSteps(
  input: BuildAcceptanceNextStepsInput
): AcceptanceNextStep[] {
  const jobCostingHref = `/projects/${input.projectId}?tab=job-costing`;
  const dailyLogsHref = `${jobCostingHref}#job-logs`;

  const steps: AcceptanceNextStep[] = [
    {
      id: "job-costing",
      label: "Enter opening job costs",
      detail: "Load labor, materials, and equipment actuals so variance tracking starts from day one.",
      href: jobCostingHref,
    },
    {
      id: "kickoff",
      label: "Schedule customer kickoff",
      detail: "Confirm start date, access, permits, and any GC coordination before mobilization.",
      href: `/projects/${input.projectId}`,
    },
    {
      id: "daily-logs",
      label: "Set up daily field logs",
      detail: "Capture crew hours and progress each day — accurate logs keep job costing honest.",
      href: dailyLogsHref,
    },
  ];

  if (input.hasGeneralContractor) {
    steps.push({
      id: "gc-coordination",
      label: "Align with general contractor",
      detail: "Confirm schedule, staging, and inspection milestones with the GC before rough-in.",
      href: `/projects/${input.projectId}`,
    });
  }

  if (["Commercial", "Industrial", "Healthcare", "Government", "Data Center"].includes(input.projectType)) {
    steps.push({
      id: "inspections",
      label: "Plan inspection milestones",
      detail: "Schedule rough-in, trim, and final inspections with the AHJ early to avoid rework delays.",
      href: `/projects/${input.projectId}`,
    });
  }

  const snapshot = input.estimateSnapshot;
  if (snapshot && snapshot.materials_total > snapshot.labor_total * 0.4) {
    steps.push({
      id: "material-buyout",
      label: "Lock material buyout",
      detail: "Material-heavy scope — confirm vendor pricing and lead times before ordering.",
    });
  }

  const margin = input.grossMarginPercent ?? snapshot?.gross_margin_percent ?? null;
  if (margin !== null && margin < 12) {
    steps.push({
      id: "margin-watch",
      label: "Watch margin closely",
      detail: `${margin.toFixed(1)}% gross margin leaves little room for variance — track costs weekly.`,
    });
  }

  return steps.slice(0, 5);
}
