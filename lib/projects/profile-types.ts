import type { ProjectFieldData } from "@/lib/projects/job-costing-types";
import type { ProjectStatus } from "@/lib/projects/types";

export type ProjectTimelineEventType =
  | "project_created"
  | "estimate_created"
  | "estimate_finalized"
  | "proposal_sent"
  | "proposal_viewed"
  | "proposal_accepted"
  | "proposal_declined"
  | "work_started"
  | "inspection"
  | "change_order"
  | "job_log"
  | "file_uploaded"
  | "project_completed"
  | "status_changed";

export type ProjectTimelineEvent = {
  id: string;
  type: ProjectTimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  href?: string;
};

export type ProjectBudgetCategory = {
  key: "labor" | "materials" | "equipment" | "subcontractors" | "miscellaneous";
  label: string;
  estimated: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isOverBudget: boolean;
};

export type ProjectBudgetSummary = {
  estimatedTotal: number;
  actualTotal: number;
  variance: number;
  variancePercent: number;
  budgetUsedPercent: number;
  remainingBudget: number;
  changeOrderCount: number;
  categories: ProjectBudgetCategory[];
  hasActuals: boolean;
  sourceEstimateTitle: string | null;
};

export type ProjectKpiSummary = {
  contractValue: number;
  estimatedProfit: number;
  grossMarginPercent: number;
  progressPercent: number;
  budgetUsedPercent: number;
  daysRemaining: number | null;
  daysRemainingLabel: string;
};

export type ProjectProposalSummary = {
  id: string;
  title: string;
  status: string;
  amount: number;
  sent_at: string | null;
  accepted_at: string | null;
  first_viewed_at: string | null;
  updated_at: string;
};

export type ProjectEstimateDetail = {
  id: string;
  title: string;
  status: string;
  total: number;
  profit_amount: number;
  gross_margin_percent: number;
  direct_cost_total: number;
  labor_total: number;
  materials_total: number;
  equipment_total: number;
  subcontractors_total: number;
  miscellaneous_total: number;
  updated_at: string;
};

export type ProjectJobActuals = {
  actual_labor: number;
  actual_materials: number;
  actual_equipment: number;
  actual_subcontractors: number;
  actual_miscellaneous: number;
  actual_total: number;
  change_order_count: number;
  recorded_at: string;
};

export type ProjectProfile = {
  projectId: string;
  kpis: ProjectKpiSummary;
  budget: ProjectBudgetSummary;
  timeline: ProjectTimelineEvent[];
  estimates: ProjectEstimateDetail[];
  proposals: ProjectProposalSummary[];
  field: ProjectFieldData;
  jobActuals: ProjectJobActuals | null;
};

export type ProjectListMetrics = {
  progressPercent: number;
  estimateCount: number;
  proposalCount: number;
  bidDueUrgency: "overdue" | "soon" | "normal" | null;
};

const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  Lead: 10,
  Estimating: 30,
  "Proposal Sent": 55,
  Awarded: 80,
  Lost: 0,
  Archived: 0,
};

export function progressFromStatus(status: ProjectStatus) {
  return STATUS_PROGRESS[status] ?? 0;
}

export function bidDueUrgency(
  bidDueDate: string | null,
  status: ProjectStatus
): ProjectListMetrics["bidDueUrgency"] {
  if (!bidDueDate || !["Lead", "Estimating", "Proposal Sent"].includes(status)) {
    return null;
  }

  const due = new Date(bidDueDate);
  due.setHours(23, 59, 59, 999);
  const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "soon";
  return "normal";
}

export function daysUntil(dateValue: string | null) {
  if (!dateValue) return null;

  const target = new Date(dateValue);
  target.setHours(23, 59, 59, 999);
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
