export const ESTIMATE_CATEGORIES = [
  "labor",
  "materials",
  "equipment",
  "subcontractors",
  "miscellaneous",
] as const;

export type EstimateCategory = (typeof ESTIMATE_CATEGORIES)[number];

export const ESTIMATE_CATEGORY_LABELS: Record<EstimateCategory, string> = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
  subcontractors: "Subcontractors",
  miscellaneous: "Miscellaneous costs",
};

export type EstimateStatus = "Draft" | "Final";

export type EstimateLineItem = {
  id: string;
  estimate_id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  sort_order: number;
  created_at: string;
};

export type Estimate = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  status: EstimateStatus;
  overhead_percent: number;
  contingency_percent: number;
  /** @deprecated Use contingency_percent */
  markup_percent?: number;
  tax_percent: number;
  profit_margin_percent: number;
  notes: string | null;
  direct_cost_total: number;
  labor_total: number;
  materials_total: number;
  equipment_total: number;
  subcontractors_total: number;
  miscellaneous_total: number;
  overhead_amount: number;
  contingency_amount: number;
  /** @deprecated Use contingency_amount */
  markup_amount?: number;
  profit_amount: number;
  tax_amount: number;
  gross_margin_percent: number;
  selling_price: number;
  grand_total: number;
  last_autosaved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EstimateWithProject = Estimate & {
  project: {
    id: string;
    project_name: string;
    project_address: string | null;
    project_type: string | null;
    customer: {
      company_name: string;
      contact_name: string;
    };
  };
};

export type EstimateListItem = Estimate & {
  project: {
    id: string;
    project_name: string;
    customer: {
      company_name: string;
    };
  };
};

export type EstimateLineItemInput = {
  id?: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  sort_order: number;
};

export type EstimateBuilderState = {
  title: string;
  notes: string;
  overhead_percent: number;
  contingency_percent: number;
  tax_percent: number;
  profit_margin_percent: number;
  line_items: EstimateLineItemInput[];
};

export type EstimateTotals = {
  categoryTotals: Record<EstimateCategory, number>;
  laborTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  subcontractorsTotal: number;
  miscellaneousTotal: number;
  directCost: number;
  overheadAmount: number;
  afterOverhead: number;
  contingencyAmount: number;
  afterContingency: number;
  profitAmount: number;
  preTaxTotal: number;
  taxAmount: number;
  finalSellingPrice: number;
  grossMarginPercent: number;
};

export type EstimateVersion = {
  id: string;
  estimate_id: string;
  user_id: string;
  version_number: number;
  label: string;
  snapshot: EstimateBuilderState;
  created_at: string;
};

export const ESTIMATES_PAGE_SIZE = 10;

export const AUTOSAVE_DEBOUNCE_MS = 3000;
