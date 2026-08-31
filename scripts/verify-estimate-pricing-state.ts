#!/usr/bin/env node

import {
  ESTIMATE_PRICING_VALIDATION_ERROR,
  formatEstimateListStatusLabel,
  formatEstimateListTotalDisplay,
  formatEstimateStatusLabel,
  hasPricedContent,
  hasValidLineItems,
  validateEstimatePricing,
} from "../lib/estimates/pricing-state";
import type { EstimateLineItemInput } from "../lib/estimates/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const percents = {
  overhead_percent: 10,
  contingency_percent: 5,
  profit_margin_percent: 15,
  tax_percent: 0,
};

const pricedLaborLine: EstimateLineItemInput = {
  category: "labor",
  description: "Journeyman electrician",
  quantity: 8,
  unit: "hrs",
  unit_cost: 85,
  sort_order: 0,
};

const zeroCostLine: EstimateLineItemInput = {
  category: "labor",
  description: "Inspector",
  quantity: 8,
  unit: "hrs",
  unit_cost: 0,
  sort_order: 0,
};

assert(!hasValidLineItems([]), "empty estimate should have no valid line items");
assert(!hasPricedContent([], percents), "empty estimate should not be priced");

assert(
  !hasPricedContent([zeroCostLine], percents),
  "zero unit cost lines should not count as priced"
);

const pricedValidation = validateEstimatePricing([zeroCostLine], percents);
assert(!pricedValidation.ok, "zero unit cost should fail validation");
if (!pricedValidation.ok) {
  assert(
    pricedValidation.error === ESTIMATE_PRICING_VALIDATION_ERROR,
    "validation should use standard error copy"
  );
}

assert(
  hasPricedContent([pricedLaborLine], percents),
  "priced labor line should count as priced"
);
assert(
  validateEstimatePricing([pricedLaborLine], percents).ok,
  "priced labor line should pass validation"
);

assert(
  formatEstimateStatusLabel("Final", [], percents) === "Needs pricing",
  "legacy final empty estimate should show Needs pricing"
);
assert(
  formatEstimateStatusLabel("Final", [pricedLaborLine], percents) === "Final",
  "priced final estimate should show Final"
);

assert(
  formatEstimateListStatusLabel("Final", 0) === "Needs pricing",
  "list status for legacy final zero total"
);
assert(
  formatEstimateListTotalDisplay(0) === "Not priced yet",
  "list total for zero should be Not priced yet"
);

console.log("estimate pricing-state verification passed");
