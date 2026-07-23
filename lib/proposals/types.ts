import type { EstimateCategory } from "@/lib/estimates/types";

export const PROPOSAL_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Declined",
  "Expired",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type ProposalLineItemSnapshot = {
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total: number;
};

export type ProposalEstimateSnapshot = {
  overhead_percent: number;
  contingency_percent: number;
  profit_margin_percent: number;
  tax_percent: number;
  labor_total: number;
  materials_total: number;
  equipment_total: number;
  subcontractors_total: number;
  miscellaneous_total: number;
  direct_cost_total: number;
  overhead_amount: number;
  contingency_amount: number;
  profit_amount: number;
  tax_amount: number;
  selling_price: number;
  gross_margin_percent: number;
  line_items_by_category: Record<EstimateCategory, ProposalLineItemSnapshot[]>;
};

export type ProposalBrandingSnapshot = {
  primary_color?: string | null;
  accent_color?: string | null;
  customer_logo_url?: string | null;
};

export type ProposalCompanySnapshot = {
  company_name: string;
  company_logo_url: string | null;
  address_lines: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  branding?: ProposalBrandingSnapshot | null;
};

export type ProposalMediaKind = "photo" | "attachment";

export type ProposalMediaItem = {
  id: string;
  proposal_id: string;
  organization_id: string;
  kind: ProposalMediaKind;
  url: string;
  storage_path: string | null;
  title: string | null;
  caption: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
};

export type Proposal = {
  id: string;
  user_id: string;
  organization_id?: string;
  project_id: string;
  estimate_id: string | null;
  title: string;
  proposal_number: string | null;
  proposal_date: string;
  expiration_date: string | null;
  status: ProposalStatus;
  amount: number;
  scope_of_work: string | null;
  materials_summary: string | null;
  labor_summary: string | null;
  equipment_summary: string | null;
  show_line_item_breakdown: boolean;
  assumptions: string | null;
  exclusions: string | null;
  terms_and_conditions: string | null;
  warranty_information: string | null;
  customer_signature_name: string | null;
  customer_signature_title: string | null;
  contractor_signature_name: string | null;
  contractor_signature_title: string | null;
  notes: string | null;
  internal_notes: string | null;
  estimate_snapshot: ProposalEstimateSnapshot | null;
  company_snapshot: ProposalCompanySnapshot | null;
  public_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  first_viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decided_at: string | null;
  archived_at: string | null;
  customer_signature_data: string | null;
  customer_signed_at: string | null;
  customer_signed_name: string | null;
  pdf_generated_at: string | null;
  pdf_page_count: number | null;
  customer_logo_url: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  last_emailed_at: string | null;
  email_send_count: number;
  last_autosaved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalWithRelations = Proposal & {
  project: {
    id: string;
    project_name: string;
    project_address: string | null;
    project_type: string;
    general_contractor: string | null;
    bid_due_date: string | null;
    customer: {
      id: string;
      company_name: string;
      contact_name: string;
      email: string;
      phone_number: string | null;
      project_address: string | null;
    };
  };
  estimate: {
    id: string;
    title: string;
  } | null;
};

export type ProposalListItem = Proposal & {
  project: {
    id: string;
    project_name: string;
    customer: {
      company_name: string;
    };
  };
  estimate: {
    id: string;
    title: string;
  } | null;
};

export type ProposalEditorState = {
  title: string;
  proposal_date: string;
  expiration_date: string;
  scope_of_work: string;
  materials_summary: string;
  labor_summary: string;
  equipment_summary: string;
  show_line_item_breakdown: boolean;
  assumptions: string;
  exclusions: string;
  terms_and_conditions: string;
  warranty_information: string;
  customer_signature_name: string;
  customer_signature_title: string;
  contractor_signature_name: string;
  contractor_signature_title: string;
  notes: string;
  internal_notes: string;
};

export type ProposalRevision = {
  id: string;
  proposal_id: string;
  user_id: string;
  version_number: number;
  label: string;
  snapshot: ProposalEditorState;
  created_at: string;
};

export type ProposalStatusHistoryEntry = {
  id: string;
  proposal_id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
};

export type ProposalEmailLog = {
  id: string;
  proposal_id: string;
  recipient_email: string;
  subject: string;
  message: string;
  portal_url: string;
  sent_at: string;
};

export type ProposalViewRecord = {
  id: string;
  proposal_id: string;
  viewer_ip: string | null;
  user_agent: string | null;
  viewed_at: string;
};

export type ProposalPortalComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type ProposalPortalMediaItem = {
  id: string;
  kind: ProposalMediaKind;
  url: string;
  title: string | null;
  caption: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
};

export type ProposalPortalData = {
  id: string;
  title: string;
  proposal_number: string | null;
  proposal_date: string;
  expiration_date: string | null;
  status: ProposalStatus;
  amount: number;
  scope_of_work: string | null;
  materials_summary: string | null;
  labor_summary: string | null;
  equipment_summary: string | null;
  assumptions: string | null;
  exclusions: string | null;
  terms_and_conditions: string | null;
  warranty_information: string | null;
  notes: string | null;
  show_line_item_breakdown: boolean;
  customer_signature_name: string | null;
  customer_signature_title: string | null;
  contractor_signature_name: string | null;
  contractor_signature_title: string | null;
  customer_signed_at: string | null;
  customer_signed_name: string | null;
  customer_signature_data: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  estimate_snapshot: ProposalEstimateSnapshot | null;
  company_snapshot: ProposalCompanySnapshot | null;
  customer_logo_url: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  media: ProposalPortalMediaItem[];
  project: {
    id: string;
    project_name: string;
    project_address: string | null;
    project_type: string;
    general_contractor: string | null;
  };
  customer: {
    company_name: string;
    contact_name: string;
    email: string;
    phone_number: string | null;
    project_address: string | null;
  };
  comments: ProposalPortalComment[];
};

export const PROPOSALS_PAGE_SIZE = 10;

export const PROPOSAL_AUTOSAVE_DEBOUNCE_MS = 3000;

export const PROPOSAL_SORT_FIELDS = [
  "proposal_date",
  "amount",
  "status",
  "created_at",
] as const;

export type ProposalSortField = (typeof PROPOSAL_SORT_FIELDS)[number];

export const PROPOSAL_STATUS_STYLES: Record<ProposalStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-primary/10 text-primary",
  Viewed: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  Accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Declined: "bg-destructive/10 text-destructive",
  Expired: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const CUSTOMER_PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  Draft: "In progress",
  Sent: "Sent",
  Viewed: "Viewed",
  Accepted: "Accepted",
  Declined: "Rejected",
  Expired: "Expired",
};

export function defaultExpirationDate(fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}
