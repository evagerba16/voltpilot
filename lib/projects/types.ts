export const PROJECT_STATUSES = [
  "Lead",
  "Estimating",
  "Proposal Sent",
  "Awarded",
  "Lost",
  "Archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ACTIVE_PROJECT_STATUSES = PROJECT_STATUSES.filter(
  (status) => status !== "Archived"
);

export const PROJECT_TYPES = [
  "Commercial",
  "Industrial",
  "Healthcare",
  "Education",
  "Retail",
  "Hospitality",
  "Multifamily",
  "Government",
  "Data Center",
  "Other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export type ProjectArchiveFilter = "active" | "archived" | "all";

export type Project = {
  id: string;
  user_id: string;
  customer_id: string;
  project_name: string;
  project_address: string | null;
  general_contractor: string | null;
  project_type: string;
  bid_due_date: string | null;
  status: ProjectStatus;
  estimated_value: number | null;
  assigned_estimator: string | null;
  notes: string | null;
  archived_at: string | null;
  pre_archive_status: ProjectStatus | null;
  created_at: string;
  updated_at: string;
};

export type ProjectWithCustomer = Project & {
  customer: {
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
  };
};

export type ProjectInput = {
  customer_id: string;
  project_name: string;
  project_address: string;
  general_contractor: string;
  project_type: string;
  bid_due_date: string;
  status: ProjectStatus;
  estimated_value: string;
  assigned_estimator: string;
  notes: string;
};

export type ProjectSortField =
  | "project_name"
  | "status"
  | "project_type"
  | "estimated_value"
  | "bid_due_date"
  | "created_at";

export type SortOrder = "asc" | "desc";

export const PROJECT_SORT_FIELDS: ProjectSortField[] = [
  "project_name",
  "status",
  "project_type",
  "estimated_value",
  "bid_due_date",
  "created_at",
];

export const PROJECTS_PAGE_SIZE = 10;

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  Lead: "bg-muted text-muted-foreground",
  Estimating: "bg-primary/10 text-primary",
  "Proposal Sent": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Awarded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Lost: "bg-destructive/10 text-destructive",
  Archived: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};
