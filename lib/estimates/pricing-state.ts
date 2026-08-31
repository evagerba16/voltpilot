import { calculateEstimateTotals, formatCurrency } from "@/lib/estimates/calculations";
import type {
  EstimateBuilderState,
  EstimateLineItemInput,
  EstimateStatus,
} from "@/lib/estimates/types";

export const ESTIMATE_PRICING_VALIDATION_ERROR =
  "Add line items with costs before marking this estimate final or creating a proposal.";

type EstimatePricingPercents = Pick<
  EstimateBuilderState,
  "overhead_percent" | "contingency_percent" | "profit_margin_percent" | "tax_percent"
>;

export function hasValidLineItems(lineItems: EstimateLineItemInput[]): boolean {
  return lineItems.some(
    (item) => item.quantity > 0 && item.description.trim().length > 0
  );
}

export function computeFinalSellingPrice(
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): number {
  const totals = calculateEstimateTotals(
    lineItems,
    percents.overhead_percent,
    percents.contingency_percent,
    percents.profit_margin_percent,
    percents.tax_percent
  );

  return totals.finalSellingPrice;
}

export function hasPricedContent(
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): boolean {
  if (!hasValidLineItems(lineItems)) {
    return false;
  }

  return computeFinalSellingPrice(lineItems, percents) > 0;
}

export function isUnpricedFinalEstimate(
  status: EstimateStatus,
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): boolean {
  return status === "Final" && !hasPricedContent(lineItems, percents);
}

export function formatEstimateStatusLabel(
  status: EstimateStatus,
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): string {
  if (status === "Draft") {
    return "In progress";
  }

  if (!hasPricedContent(lineItems, percents)) {
    return "Needs pricing";
  }

  return "Final";
}

/** List views only have stored totals — treat Final + zero total as unpriced legacy rows. */
export function formatEstimateListStatusLabel(
  status: EstimateStatus,
  sellingPrice: number
): string {
  if (status === "Draft") {
    return "In progress";
  }

  if (sellingPrice <= 0) {
    return "Needs pricing";
  }

  return "Final";
}

export function formatEstimateTotalDisplay(
  sellingPrice: number,
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): string {
  if (!hasPricedContent(lineItems, percents)) {
    return "Not priced yet";
  }

  return formatCurrency(sellingPrice);
}

export function formatEstimateListTotalDisplay(sellingPrice: number): string {
  if (sellingPrice <= 0) {
    return "Not priced yet";
  }

  return formatCurrency(sellingPrice);
}

export function validateEstimatePricing(
  lineItems: EstimateLineItemInput[],
  percents: EstimatePricingPercents
): { ok: true } | { ok: false; error: string } {
  if (!hasValidLineItems(lineItems)) {
    return { ok: false, error: ESTIMATE_PRICING_VALIDATION_ERROR };
  }

  if (!hasPricedContent(lineItems, percents)) {
    return { ok: false, error: ESTIMATE_PRICING_VALIDATION_ERROR };
  }

  return { ok: true };
}
