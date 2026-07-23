import { calculateEstimateTotals } from "@/lib/estimates/calculations";
import type {
  EstimateBuilderState,
  EstimateCategory,
  EstimateLineItemInput,
} from "@/lib/estimates/types";

export type ReviewSuggestionSeverity = "info" | "warning" | "critical";

export type ReviewSuggestionCategory =
  | "missing_materials"
  | "missing_labor"
  | "duplicate_items"
  | "unusual_labor"
  | "inconsistent_pricing"
  | "low_margin"
  | "estimating_risks"
  | "suggested_items"
  | "pre_proposal";

export const REVIEW_CATEGORY_LABELS: Record<ReviewSuggestionCategory, string> = {
  missing_materials: "Missing materials",
  missing_labor: "Missing labor",
  duplicate_items: "Duplicate line items",
  unusual_labor: "Unusual labor",
  inconsistent_pricing: "Inconsistent pricing",
  low_margin: "Low margin",
  estimating_risks: "Estimating risks",
  suggested_items: "Suggested additions",
  pre_proposal: "Pre-proposal review",
};

export type ReviewSuggestion = {
  id: string;
  category: ReviewSuggestionCategory;
  severity: ReviewSuggestionSeverity;
  title: string;
  description: string;
};

export type EstimateReviewResult = {
  suggestions: ReviewSuggestion[];
  summary: string;
  reviewedAt: string;
  source?: "rules" | "openai" | "hybrid";
  aiEnabled?: boolean;
};

const MATERIAL_KEYWORDS = [
  "wire",
  "conduit",
  "cable",
  "panel",
  "breaker",
  "fixture",
  "device",
  "box",
  "fitting",
  "raceway",
  "transformer",
  "switchgear",
];

const LABOR_RATE_LOW = 45;
const LABOR_RATE_HIGH = 165;
const LABOR_HOURS_HIGH = 2000;

function activeLineItems(items: EstimateLineItemInput[]) {
  return items.filter(
    (item) =>
      item.description.trim() ||
      item.quantity > 0 ||
      item.unit_cost > 0
  );
}

function itemsByCategory(items: EstimateLineItemInput[], category: EstimateCategory) {
  return activeLineItems(items).filter((item) => item.category === category);
}

function createSuggestion(
  category: ReviewSuggestionCategory,
  severity: ReviewSuggestionSeverity,
  title: string,
  description: string
): ReviewSuggestion {
  return {
    id: `${category}-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
    category,
    severity,
    title,
    description,
  };
}

function checkMissingMaterials(
  state: EstimateBuilderState,
  totals: ReturnType<typeof calculateEstimateTotals>
) {
  const suggestions: ReviewSuggestion[] = [];
  const laborItems = itemsByCategory(state.line_items, "labor");
  const materialItems = itemsByCategory(state.line_items, "materials");

  if (laborItems.length > 0 && materialItems.length === 0) {
    suggestions.push(
      createSuggestion(
        "missing_materials",
        "warning",
        "No material lines included",
        "Labor is present but the materials section is empty. Most electrical bids include wire, conduit, fittings, or devices tied to installed work."
      )
    );
  }

  if (
    totals.categoryTotals.labor > 0 &&
    totals.categoryTotals.materials > 0 &&
    totals.categoryTotals.materials / totals.categoryTotals.labor < 0.15
  ) {
    suggestions.push(
      createSuggestion(
        "missing_materials",
        "warning",
        "Materials appear low relative to labor",
        `Materials are ${((totals.categoryTotals.materials / totals.categoryTotals.labor) * 100).toFixed(0)}% of labor cost. Electrical estimates often run closer to 25–60% depending on scope.`
      )
    );
  }

  const laborText = laborItems
    .map((item) => item.description.toLowerCase())
    .join(" ");
  const materialText = materialItems
    .map((item) => item.description.toLowerCase())
    .join(" ");

  for (const keyword of MATERIAL_KEYWORDS) {
    if (laborText.includes(keyword) && !materialText.includes(keyword)) {
      suggestions.push(
        createSuggestion(
          "missing_materials",
          "info",
          `Consider material allowance for "${keyword}"`,
          `Labor references "${keyword}" but no matching material line was found. Verify consumables and installed equipment are captured.`
        )
      );
      break;
    }
  }

  if (totals.directCost > 25000 && materialItems.length < 3) {
    suggestions.push(
      createSuggestion(
        "missing_materials",
        "info",
        "Limited material detail for project size",
        "This estimate has a sizable direct cost but only a few material lines. Breaking out major commodities can reduce pricing risk."
      )
    );
  }

  return suggestions;
}

function normalizeDescription(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkMissingLabor(state: EstimateBuilderState) {
  const suggestions: ReviewSuggestion[] = [];
  const laborItems = itemsByCategory(state.line_items, "labor");
  const materialItems = itemsByCategory(state.line_items, "materials");
  const equipmentItems = itemsByCategory(state.line_items, "equipment");
  const subItems = itemsByCategory(state.line_items, "subcontractors");

  const installScopes = [...materialItems, ...equipmentItems, ...subItems].filter(
    (item) => item.quantity > 0 && item.description.trim()
  );

  if (installScopes.length > 0 && laborItems.length === 0) {
    suggestions.push(
      createSuggestion(
        "missing_labor",
        "warning",
        "No labor lines included",
        "Materials, equipment, or subcontractor scopes are present without corresponding labor. Verify installation, supervision, and testing hours are captured."
      )
    );
  }

  const materialText = materialItems
    .map((item) => item.description.toLowerCase())
    .join(" ");

  if (
    (materialText.includes("panel") ||
      materialText.includes("switchgear") ||
      materialText.includes("transformer")) &&
    laborItems.length === 0
  ) {
    suggestions.push(
      createSuggestion(
        "missing_labor",
        "warning",
        "Major equipment without labor allowance",
        "Distribution equipment typically requires rigging, terminations, testing, and startup labor. Confirm these hours are included."
      )
    );
  }

  for (const item of laborItems) {
    if (item.quantity > 0 && item.unit_cost === 0) {
      suggestions.push(
        createSuggestion(
          "missing_labor",
          "info",
          `Labor line missing rate`,
          `"${item.description || "Labor line"}" has hours but no unit cost. Unpriced labor will understate the bid.`
        )
      );
      break;
    }
  }

  return suggestions.slice(0, 4);
}

function checkDuplicateItems(state: EstimateBuilderState) {
  const suggestions: ReviewSuggestion[] = [];
  const activeItems = activeLineItems(state.line_items);
  const seen = new Map<string, EstimateLineItemInput[]>();

  for (const item of activeItems) {
    const key = `${item.category}:${normalizeDescription(item.description)}`;

    if (!item.description.trim()) {
      continue;
    }

    const group = seen.get(key) ?? [];
    group.push(item);
    seen.set(key, group);
  }

  for (const [, group] of seen) {
    if (group.length < 2) {
      continue;
    }

    suggestions.push(
      createSuggestion(
        "duplicate_items",
        "warning",
        `Possible duplicate: "${group[0].description}"`,
        `${group.length} similar line items found in ${group[0].category}. Review for double-counting or consolidate for clarity.`
      )
    );
  }

  return suggestions.slice(0, 4);
}

function checkUnusualLabor(state: EstimateBuilderState) {
  const suggestions: ReviewSuggestion[] = [];
  const laborItems = itemsByCategory(state.line_items, "labor");

  for (const item of laborItems) {
    if (item.unit === "hrs" && item.unit_cost > 0) {
      if (item.unit_cost < LABOR_RATE_LOW) {
        suggestions.push(
          createSuggestion(
            "unusual_labor",
            "warning",
            `Low labor rate on "${item.description || "line item"}"`,
            `$${item.unit_cost.toFixed(2)}/hr is below typical burdened field rates. Confirm burden, benefits, and prevailing wage requirements.`
          )
        );
      } else if (item.unit_cost > LABOR_RATE_HIGH) {
        suggestions.push(
          createSuggestion(
            "unusual_labor",
            "warning",
            `High labor rate on "${item.description || "line item"}"`,
            `$${item.unit_cost.toFixed(2)}/hr is unusually high. Verify overtime, specialty craft, or foreman burden is intentional.`
          )
        );
      }
    }

    if (item.quantity > LABOR_HOURS_HIGH) {
      suggestions.push(
        createSuggestion(
          "unusual_labor",
          "warning",
          `High labor hours on "${item.description || "line item"}"`,
          `${item.quantity.toLocaleString()} hours on a single line is uncommon. Consider splitting phases or crews for clarity and auditability.`
        )
      );
    }

    if (item.quantity > 0 && item.unit_cost === 0) {
      suggestions.push(
        createSuggestion(
          "unusual_labor",
          "info",
          `Labor line missing rate`,
          `"${item.description || "Labor line"}" has hours but no unit cost. Unpriced labor will understate the bid.`
        )
      );
    }
  }

  return suggestions.slice(0, 4);
}

function checkInconsistentPricing(state: EstimateBuilderState) {
  const suggestions: ReviewSuggestion[] = [];

  for (const category of [
    "labor",
    "materials",
    "equipment",
    "subcontractors",
    "miscellaneous",
  ] as const) {
    const items = itemsByCategory(state.line_items, category).filter(
      (item) => item.unit_cost > 0
    );

    if (items.length < 2) {
      continue;
    }

    const byUnit = new Map<string, EstimateLineItemInput[]>();

    for (const item of items) {
      const unit = item.unit.toLowerCase();
      const group = byUnit.get(unit) ?? [];
      group.push(item);
      byUnit.set(unit, group);
    }

    for (const [unit, group] of byUnit) {
      if (group.length < 2) {
        continue;
      }

      const costs = group.map((item) => item.unit_cost);
      const min = Math.min(...costs);
      const max = Math.max(...costs);

      if (min > 0 && max / min >= 3) {
        suggestions.push(
          createSuggestion(
            "inconsistent_pricing",
            "warning",
            `Wide ${category} price spread (${unit})`,
            `Unit costs for ${unit} lines range from $${min.toFixed(2)} to $${max.toFixed(2)}. Check for duplicate scopes, unit mismatches, or outdated pricing.`
          )
        );
      }
    }
  }

  const laborTotal = itemsByCategory(state.line_items, "labor").reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );
  const subTotal = itemsByCategory(state.line_items, "subcontractors").reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );

  if (laborTotal > 0 && subTotal > 0 && subTotal < laborTotal * 0.35) {
    suggestions.push(
      createSuggestion(
        "inconsistent_pricing",
        "info",
        "Subcontractor pricing may be light",
        "Subcontractor costs are low compared with self-performed labor. Confirm vendor quotes include markup, supervision, and coordination."
      )
    );
  }

  return suggestions.slice(0, 4);
}

function checkLowMargins(state: EstimateBuilderState, totals: ReturnType<typeof calculateEstimateTotals>) {
  const suggestions: ReviewSuggestion[] = [];

  if (state.profit_margin_percent < 5) {
    suggestions.push(
      createSuggestion(
        "low_margin",
        "critical",
        "Profit margin is very low",
        `${state.profit_margin_percent}% profit margin leaves little room for buyout variance, RFIs, or schedule disruption.`
      )
    );
  } else if (state.profit_margin_percent < 10) {
    suggestions.push(
      createSuggestion(
        "low_margin",
        "warning",
        "Profit margin is below typical targets",
        `${state.profit_margin_percent}% profit margin is lean for electrical contracting work. Many contractors target 10–18% depending on risk.`
      )
    );
  }

  if (state.overhead_percent < 5 && totals.directCost > 10000) {
    suggestions.push(
      createSuggestion(
        "low_margin",
        "warning",
        "Overhead recovery appears low",
        `${state.overhead_percent}% overhead may not cover project management, vehicles, insurance, and office burden on this scope.`
      )
    );
  }

  if (state.contingency_percent < 3 && totals.directCost > 10000) {
    suggestions.push(
      createSuggestion(
        "low_margin",
        "info",
        "Contingency is minimal",
        `${state.contingency_percent}% contingency provides limited cushion before profit. Confirm escalation and buyout risk are covered elsewhere.`
      )
    );
  }

  const effectiveMargin =
    totals.finalSellingPrice > 0
      ? (totals.profitAmount / totals.finalSellingPrice) * 100
      : 0;

  if (totals.finalSellingPrice > 50000 && effectiveMargin < 6) {
    suggestions.push(
      createSuggestion(
        "low_margin",
        "critical",
        "Net profit dollars are thin on a large bid",
        `Projected profit is about ${effectiveMargin.toFixed(1)}% of the selling price. Large proposals often need stronger margin protection.`
      )
    );
  }

  return suggestions;
}

function checkPreProposal(
  state: EstimateBuilderState,
  totals: ReturnType<typeof calculateEstimateTotals>
) {
  const suggestions: ReviewSuggestion[] = [];
  const activeItems = activeLineItems(state.line_items);

  if (totals.finalSellingPrice === 0) {
    suggestions.push(
      createSuggestion(
        "pre_proposal",
        "critical",
        "Estimate total is zero",
        "Line items or percentages have not produced a sell price. Complete pricing before issuing a proposal."
      )
    );
  }

  if (!state.notes.trim() && totals.finalSellingPrice > 25000) {
    suggestions.push(
      createSuggestion(
        "pre_proposal",
        "warning",
        "Add assumptions or exclusions",
        "Large estimates without notes can create scope disputes. Document allowances, alternates, and exclusions before sending."
      )
    );
  }

  if (activeItems.length < 4 && totals.finalSellingPrice > 10000) {
    suggestions.push(
      createSuggestion(
        "pre_proposal",
        "warning",
        "Estimate may be under-detailed",
        "The bid total is meaningful but line-item detail is sparse. Review whether major scopes are rolled up too aggressively."
      )
    );
  }

  if (state.tax_percent === 0 && totals.finalSellingPrice > 15000) {
    suggestions.push(
      createSuggestion(
        "pre_proposal",
        "info",
        "Confirm tax treatment",
        "No tax is applied. Verify whether sales/use tax, exempt status, or tax-included pricing should be reflected."
      )
    );
  }

  const incompleteLines = activeItems.filter(
    (item) => !item.description.trim() || (item.quantity > 0 && item.unit_cost === 0)
  );

  if (incompleteLines.length > 0) {
    suggestions.push(
      createSuggestion(
        "pre_proposal",
        "warning",
        `${incompleteLines.length} line item(s) need attention`,
        "Some lines are missing descriptions or unit costs. Clean these up so reviewers and clients see a complete estimate."
      )
    );
  }

  return suggestions;
}

function buildSummary(suggestions: ReviewSuggestion[]) {
  if (suggestions.length === 0) {
    return "No major issues detected. Review allowances and scope notes before sending the proposal.";
  }

  const critical = suggestions.filter((item) => item.severity === "critical").length;
  const warning = suggestions.filter((item) => item.severity === "warning").length;

  if (critical > 0) {
    return `${critical} critical and ${warning} warning item(s) found. Address these before sending the proposal.`;
  }

  if (warning > 0) {
    return `${warning} warning item(s) found. Review highlighted areas to reduce bid risk.`;
  }

  return `${suggestions.length} informational suggestion(s) found. Estimate looks reasonable, but verify scope assumptions.`;
}

export function reviewEstimate(state: EstimateBuilderState): EstimateReviewResult {
  const totals = calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    state.profit_margin_percent,
    state.tax_percent
  );

  const suggestions = [
    ...checkMissingMaterials(state, totals),
    ...checkMissingLabor(state),
    ...checkDuplicateItems(state),
    ...checkUnusualLabor(state),
    ...checkInconsistentPricing(state),
    ...checkLowMargins(state, totals),
    ...checkPreProposal(state, totals),
  ];

  const unique = new Map<string, ReviewSuggestion>();

  for (const suggestion of suggestions) {
    unique.set(suggestion.id, suggestion);
  }

  const ordered = Array.from(unique.values()).sort((a, b) => {
    const severityRank = { critical: 0, warning: 1, info: 2 };
    return severityRank[a.severity] - severityRank[b.severity];
  });

  return {
    suggestions: ordered,
    summary: buildSummary(ordered),
    reviewedAt: new Date().toISOString(),
    source: "rules",
    aiEnabled: false,
  };
}
