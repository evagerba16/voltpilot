import {
  ESTIMATE_CATEGORIES,
  type EstimateCategory,
  type EstimateLineItemInput,
  type EstimateTotals,
} from "@/lib/estimates/types";

export function calculateLineTotal(quantity: number, unitCost: number) {
  return quantity * unitCost;
}

export function calculateCategoryTotal(items: EstimateLineItemInput[]) {
  return items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unit_cost),
    0
  );
}

export function calculateEstimateTotals(
  lineItems: EstimateLineItemInput[],
  overheadPercent: number,
  contingencyPercent: number,
  profitMarginPercent: number,
  taxPercent: number
): EstimateTotals {
  const categoryTotals = ESTIMATE_CATEGORIES.reduce(
    (totals, category) => {
      const items = lineItems.filter((item) => item.category === category);
      totals[category] = calculateCategoryTotal(items);
      return totals;
    },
    {} as Record<EstimateCategory, number>
  );

  const laborTotal = categoryTotals.labor;
  const materialsTotal = categoryTotals.materials;
  const equipmentTotal = categoryTotals.equipment;
  const subcontractorsTotal = categoryTotals.subcontractors;
  const miscellaneousTotal = categoryTotals.miscellaneous;

  const directCost = ESTIMATE_CATEGORIES.reduce(
    (sum, category) => sum + categoryTotals[category],
    0
  );

  const overheadAmount = directCost * (overheadPercent / 100);
  const afterOverhead = directCost + overheadAmount;
  const contingencyAmount = afterOverhead * (contingencyPercent / 100);
  const afterContingency = afterOverhead + contingencyAmount;
  const profitAmount = afterContingency * (profitMarginPercent / 100);
  const preTaxTotal = afterContingency + profitAmount;
  const taxAmount = preTaxTotal * (taxPercent / 100);
  const finalSellingPrice = preTaxTotal + taxAmount;
  const grossMarginPercent =
    finalSellingPrice > 0 ? (profitAmount / finalSellingPrice) * 100 : 0;

  return {
    categoryTotals,
    laborTotal,
    materialsTotal,
    equipmentTotal,
    subcontractorsTotal,
    miscellaneousTotal,
    directCost,
    overheadAmount,
    afterOverhead,
    contingencyAmount,
    afterContingency,
    profitAmount,
    preTaxTotal,
    taxAmount,
    finalSellingPrice,
    grossMarginPercent,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
