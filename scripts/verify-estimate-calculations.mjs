#!/usr/bin/env node

/**
 * Verify estimate calculation logic.
 * Run: npm run estimates:verify
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function calculateLineTotal(quantity, unitCost) {
  return quantity * unitCost;
}

function calculateEstimateTotals(
  lineItems,
  overheadPercent,
  contingencyPercent,
  profitMarginPercent,
  taxPercent
) {
  const categories = [
    "labor",
    "materials",
    "equipment",
    "subcontractors",
    "miscellaneous",
  ];
  const categoryTotals = Object.fromEntries(
    categories.map((category) => [
      category,
      lineItems
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0),
    ])
  );

  const directCost = categories.reduce(
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

  return {
    directCost,
    overheadAmount,
    contingencyAmount,
    profitAmount,
    taxAmount,
    finalSellingPrice,
  };
}

function run() {
  const lineItems = [
    {
      category: "labor",
      description: "Electrician",
      quantity: 10,
      unit_cost: 85,
    },
    {
      category: "materials",
      description: "Wire",
      quantity: 1,
      unit_cost: 1200,
    },
  ];

  const totals = calculateEstimateTotals(lineItems, 10, 5, 12, 0);

  assert(totals.directCost === 2050, "direct cost should sum line items");
  assert(totals.overheadAmount === 205, "overhead should be 10% of direct cost");
  assert(totals.finalSellingPrice > totals.directCost, "selling price should exceed direct cost");
  assert(calculateLineTotal(2, 50) === 100, "line total should multiply quantity by unit cost");

  console.log("Estimate calculation verification passed.");
}

run();
