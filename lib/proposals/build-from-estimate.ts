import { calculateEstimateTotals, calculateLineTotal } from "@/lib/estimates/calculations";
import {
  ESTIMATE_CATEGORIES,
  ESTIMATE_CATEGORY_LABELS,
  type EstimateCategory,
  type EstimateLineItem,
  type EstimateLineItemInput,
} from "@/lib/estimates/types";
import type { CompanySettings } from "@/lib/company/types";
import { companySettingsToSnapshot } from "@/lib/company/format";
import type {
  ProposalEditorState,
  ProposalEstimateSnapshot,
  ProposalLineItemSnapshot,
} from "@/lib/proposals/types";
import { defaultExpirationDate } from "@/lib/proposals/types";

function activeLineItems(items: EstimateLineItem[] | EstimateLineItemInput[]) {
  return items.filter(
    (item) =>
      item.description.trim() ||
      item.quantity > 0 ||
      item.unit_cost > 0
  );
}

function summarizeCategory(
  category: EstimateCategory,
  items: EstimateLineItem[] | EstimateLineItemInput[]
) {
  const categoryItems = activeLineItems(items).filter(
    (item) => item.category === category
  );

  if (categoryItems.length === 0) {
    return "";
  }

  const lines = categoryItems
    .filter((item) => item.description.trim())
    .map(
      (item) =>
        `• ${item.description.trim()} — ${item.quantity} ${item.unit} @ $${item.unit_cost.toFixed(2)}`
    );

  if (lines.length === 0) {
    return `${ESTIMATE_CATEGORY_LABELS[category]} included per estimate breakdown.`;
  }

  return lines.join("\n");
}

export function buildEstimateSnapshot(
  lineItems: EstimateLineItem[] | EstimateLineItemInput[],
  overheadPercent: number,
  contingencyPercent: number,
  profitMarginPercent: number,
  taxPercent: number
): ProposalEstimateSnapshot {
  const normalizedItems: EstimateLineItemInput[] = lineItems.map((item, index) => ({
    id: "id" in item ? item.id : undefined,
    category: item.category,
    description: item.description,
    quantity: Number(item.quantity),
    unit: item.unit,
    unit_cost: Number(item.unit_cost),
    sort_order: item.sort_order ?? index,
  }));

  const totals = calculateEstimateTotals(
    normalizedItems,
    overheadPercent,
    contingencyPercent,
    profitMarginPercent,
    taxPercent
  );

  const lineItemsByCategory = ESTIMATE_CATEGORIES.reduce(
    (grouped, category) => {
      grouped[category] = activeLineItems(normalizedItems)
        .filter((item) => item.category === category)
        .map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          total: calculateLineTotal(item.quantity, item.unit_cost),
        }));

      return grouped;
    },
    {} as Record<EstimateCategory, ProposalLineItemSnapshot[]>
  );

  return {
    overhead_percent: overheadPercent,
    contingency_percent: contingencyPercent,
    profit_margin_percent: profitMarginPercent,
    tax_percent: taxPercent,
    labor_total: totals.laborTotal,
    materials_total: totals.materialsTotal,
    equipment_total: totals.equipmentTotal,
    subcontractors_total: totals.subcontractorsTotal,
    miscellaneous_total: totals.miscellaneousTotal,
    direct_cost_total: totals.directCost,
    overhead_amount: totals.overheadAmount,
    contingency_amount: totals.contingencyAmount,
    profit_amount: totals.profitAmount,
    tax_amount: totals.taxAmount,
    selling_price: totals.finalSellingPrice,
    gross_margin_percent: totals.grossMarginPercent,
    line_items_by_category: lineItemsByCategory,
  };
}

export function buildDefaultProposalContent(
  lineItems: EstimateLineItem[] | EstimateLineItemInput[],
  company: CompanySettings,
  projectName: string,
  customerContactName: string
): ProposalEditorState {
  const scopeItems = activeLineItems(lineItems)
    .filter((item) => item.description.trim())
    .slice(0, 8)
    .map((item) => `• ${item.description.trim()}`);

  return {
    title: `${projectName} Proposal`,
    proposal_date: new Date().toISOString().slice(0, 10),
    expiration_date: defaultExpirationDate(),
    scope_of_work:
      scopeItems.length > 0
        ? `Electrical scope of work for ${projectName}:\n\n${scopeItems.join("\n")}`
        : `Electrical scope of work for ${projectName} as detailed in the attached estimate.`,
    materials_summary: summarizeCategory("materials", lineItems),
    labor_summary: summarizeCategory("labor", lineItems),
    equipment_summary: summarizeCategory("equipment", lineItems),
    show_line_item_breakdown: true,
    assumptions: [
      "Normal working hours, Monday through Friday.",
      "Clear access to work areas and coordinated site logistics.",
      "Existing conditions are as observed during site review.",
      "Work conforms to applicable NEC and local amendments.",
    ].join("\n"),
    exclusions: company.default_exclusions ?? "",
    terms_and_conditions: company.default_terms ?? "",
    warranty_information: company.default_warranty ?? "",
    customer_signature_name: customerContactName,
    customer_signature_title: "Authorized Representative",
    contractor_signature_name: company.contractor_signature_name ?? "",
    contractor_signature_title: company.contractor_signature_title ?? "Project Manager",
    notes: "",
    internal_notes: "",
  };
}

export function buildProposalSeedData({
  lineItems,
  overheadPercent,
  contingencyPercent,
  profitMarginPercent,
  taxPercent,
  company,
  projectName,
  customerContactName,
}: {
  lineItems: EstimateLineItem[];
  overheadPercent: number;
  contingencyPercent: number;
  profitMarginPercent: number;
  taxPercent: number;
  company: CompanySettings;
  projectName: string;
  customerContactName: string;
}) {
  const content = buildDefaultProposalContent(
    lineItems,
    company,
    projectName,
    customerContactName
  );
  const estimateSnapshot = buildEstimateSnapshot(
    lineItems,
    overheadPercent,
    contingencyPercent,
    profitMarginPercent,
    taxPercent
  );

  return {
    content,
    estimateSnapshot,
    companySnapshot: companySettingsToSnapshot(company),
    amount: estimateSnapshot.selling_price,
  };
}

export function recalculateProposalAmount(
  estimateSnapshot: ProposalEstimateSnapshot | null | undefined
): number | null {
  if (!estimateSnapshot) {
    return null;
  }

  const lineItems: EstimateLineItemInput[] = [];

  for (const category of ESTIMATE_CATEGORIES) {
    for (const item of estimateSnapshot.line_items_by_category[category] ?? []) {
      lineItems.push({
        category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        sort_order: lineItems.length,
      });
    }
  }

  const totals = calculateEstimateTotals(
    lineItems,
    estimateSnapshot.overhead_percent,
    estimateSnapshot.contingency_percent,
    estimateSnapshot.profit_margin_percent,
    estimateSnapshot.tax_percent
  );

  return totals.finalSellingPrice;
}

export function mapProposalToEditorState(proposal: {
  title: string;
  proposal_date: string;
  expiration_date?: string | null;
  scope_of_work: string | null;
  materials_summary: string | null;
  labor_summary: string | null;
  equipment_summary: string | null;
  show_line_item_breakdown: boolean;
  assumptions?: string | null;
  exclusions: string | null;
  terms_and_conditions: string | null;
  warranty_information: string | null;
  customer_signature_name: string | null;
  customer_signature_title: string | null;
  contractor_signature_name: string | null;
  contractor_signature_title: string | null;
  notes: string | null;
  internal_notes?: string | null;
}): ProposalEditorState {
  return {
    title: proposal.title,
    proposal_date: proposal.proposal_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    expiration_date:
      proposal.expiration_date?.slice(0, 10) ?? defaultExpirationDate(new Date(proposal.proposal_date)),
    scope_of_work: proposal.scope_of_work ?? "",
    materials_summary: proposal.materials_summary ?? "",
    labor_summary: proposal.labor_summary ?? "",
    equipment_summary: proposal.equipment_summary ?? "",
    show_line_item_breakdown: proposal.show_line_item_breakdown,
    assumptions: proposal.assumptions ?? "",
    exclusions: proposal.exclusions ?? "",
    terms_and_conditions: proposal.terms_and_conditions ?? "",
    warranty_information: proposal.warranty_information ?? "",
    customer_signature_name: proposal.customer_signature_name ?? "",
    customer_signature_title: proposal.customer_signature_title ?? "",
    contractor_signature_name: proposal.contractor_signature_name ?? "",
    contractor_signature_title: proposal.contractor_signature_title ?? "",
    notes: proposal.notes ?? "",
    internal_notes: proposal.internal_notes ?? "",
  };
}
