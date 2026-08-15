export type CustomerStatus =
  | "lead"
  | "prospect"
  | "active"
  | "completed"
  | "archived";

export type Customer = {
  id: string;
  user_id: string;
  organization_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string | null;
  project_address: string | null;
  notes: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  project_address: string;
  notes: string;
  status: CustomerStatus;
};

export type CustomerSortField =
  | "company_name"
  | "contact_name"
  | "email"
  | "created_at"
  | "status";

export type SortOrder = "asc" | "desc";

export type CustomerProjectFilter = "all" | "with_projects" | "without_projects";

export type CustomerNotesFilter = "all" | "with_notes" | "without_notes";

export type CustomerStatusFilter = CustomerStatus | "all";

export type CustomerNote = {
  id: string;
  customer_id: string;
  organization_id: string;
  user_id: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
};

export type CustomerDocumentCategory =
  | "contract"
  | "photo"
  | "permit"
  | "warranty"
  | "blueprint"
  | "inspection"
  | "other";

export type CustomerDocument = {
  id: string;
  customer_id: string;
  organization_id: string;
  user_id: string;
  file_name: string;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  category: CustomerDocumentCategory;
  created_at: string;
};

export type CustomerProjectSummary = {
  id: string;
  project_name: string;
  status: string;
  estimated_value: number | null;
  updated_at: string;
};

export type CustomerEstimateSummary = {
  id: string;
  title: string;
  status: string;
  grand_total: number | null;
  project_name: string;
  updated_at: string;
};

export type CustomerProposalSummary = {
  id: string;
  title: string;
  status: string;
  amount: number | null;
  project_name: string;
  sent_at: string | null;
  updated_at: string;
};

export type CustomerProfileSummary = {
  totalRevenue: number;
  activeProjectCount: number;
  openEstimateCount: number;
  openProposalCount: number;
  /** Sum of accepted proposal amounts on projects not yet completed/lost/archived. */
  openContractValue: number;
  lastActivityAt: string | null;
};

export type CustomerTimelineEventType =
  | "customer_created"
  | "customer_updated"
  | "note_added"
  | "document_uploaded"
  | "project_created"
  | "project_started"
  | "estimate_created"
  | "proposal_sent"
  | "proposal_viewed"
  | "proposal_accepted"
  | "invoice_paid";

export type CustomerTimelineEvent = {
  id: string;
  type: CustomerTimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  href?: string;
};

export type CustomerAiInsight = {
  id: string;
  tone: "warning" | "success" | "info" | "opportunity";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export type CustomerProfile = {
  customer: Customer;
  summary: CustomerProfileSummary;
  projectCount: number;
  projects: CustomerProjectSummary[];
  openEstimates: CustomerEstimateSummary[];
  openProposals: CustomerProposalSummary[];
  notes: CustomerNote[];
  documents: CustomerDocument[];
  timeline: CustomerTimelineEvent[];
  aiInsights: CustomerAiInsight[];
};

export type CustomerListItem = Customer & {
  project_count: number;
  active_project_count: number;
  total_revenue: number;
  last_activity_at: string | null;
};

export const CUSTOMER_SORT_FIELDS: CustomerSortField[] = [
  "company_name",
  "contact_name",
  "email",
  "created_at",
  "status",
];

export const CUSTOMERS_PAGE_SIZE = 10;

export const CUSTOMER_STATUSES: { value: CustomerStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const CUSTOMER_STATUS_FILTERS: {
  value: CustomerStatusFilter;
  label: string;
}[] = [{ value: "all", label: "All statuses" }, ...CUSTOMER_STATUSES];

export const CUSTOMER_PROJECT_FILTERS: {
  value: CustomerProjectFilter;
  label: string;
}[] = [
  { value: "all", label: "All customers" },
  { value: "with_projects", label: "With projects" },
  { value: "without_projects", label: "No projects yet" },
];

export const CUSTOMER_NOTES_FILTERS: {
  value: CustomerNotesFilter;
  label: string;
}[] = [
  { value: "all", label: "Any notes" },
  { value: "with_notes", label: "Has notes" },
  { value: "without_notes", label: "No notes" },
];

export const CUSTOMER_DOCUMENT_CATEGORIES: {
  value: CustomerDocumentCategory;
  label: string;
}[] = [
  { value: "contract", label: "Contract" },
  { value: "photo", label: "Photo" },
  { value: "permit", label: "Permit" },
  { value: "warranty", label: "Warranty" },
  { value: "blueprint", label: "Blueprint" },
  { value: "inspection", label: "Inspection report" },
  { value: "other", label: "Other" },
];

export const CUSTOMER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const CUSTOMER_DOCUMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv";

export const OPEN_PROPOSAL_STATUSES = ["Draft", "Sent", "Viewed"] as const;
