export type ChangeOrderStatus = "draft" | "pending" | "approved" | "rejected";

export const CHANGE_ORDER_STATUSES: ChangeOrderStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
];

export const CHANGE_ORDER_STATUS_STYLES: Record<ChangeOrderStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
};

export type ProjectChangeOrder = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: ChangeOrderStatus;
  value_change: number;
  cost_impact: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectJobLogPhoto = {
  id: string;
  job_log_id: string;
  file_name: string;
  url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

export type ProjectJobLog = {
  id: string;
  project_id: string;
  log_date: string;
  crew_members: string;
  hours_worked: number;
  work_completed: string;
  delays: string | null;
  weather: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  photos: ProjectJobLogPhoto[];
};

export type JobCostingActualsInput = {
  actual_labor: number;
  actual_materials: number;
  actual_equipment: number;
  actual_subcontractors: number;
  actual_miscellaneous: number;
};

export type ProjectFieldData = {
  changeOrders: ProjectChangeOrder[];
  jobLogs: ProjectJobLog[];
  approvedChangeOrderValue: number;
  pendingChangeOrderCount: number;
  totalLogHours: number;
  estimatedLaborHours: number;
  daysSinceLastLog: number | null;
};
