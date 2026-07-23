import {
  ESTIMATE_CATEGORIES,
  type EstimateBuilderState,
  type EstimateCategory,
  type EstimateLineItemInput,
} from "@/lib/estimates/types";
import type {
  AiEstimateAssistantRecommendation,
  AiEstimateLineItemRecommendation,
  AiEstimateMarkupRecommendation,
} from "@/lib/ai/types";

export function mergeAiRecommendations(
  state: EstimateBuilderState,
  recommendations: AiEstimateAssistantRecommendation,
  generateId: () => string = () => crypto.randomUUID()
): EstimateBuilderState {
  const maxSortOrder = state.line_items.reduce(
    (max, item) => Math.max(max, item.sort_order),
    -1
  );

  const newLineItems: EstimateLineItemInput[] = recommendations.line_items.map(
    (item, index) => ({
      id: generateId(),
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      sort_order: maxSortOrder + 1 + index,
    })
  );

  return {
    ...state,
    overhead_percent: recommendations.markup.overhead_percent,
    contingency_percent: recommendations.markup.contingency_percent,
    profit_margin_percent: recommendations.markup.profit_margin_percent,
    line_items: [...state.line_items, ...newLineItems],
  };
}

export function countRecommendationsByCategory(
  items: AiEstimateLineItemRecommendation[]
) {
  return ESTIMATE_CATEGORIES.reduce(
    (counts, category) => {
      counts[category] = items.filter((item) => item.category === category).length;
      return counts;
    },
    {} as Record<EstimateCategory, number>
  );
}

export function summarizeMarkupChanges(
  current: Pick<
    EstimateBuilderState,
    "overhead_percent" | "contingency_percent" | "profit_margin_percent"
  >,
  markup: AiEstimateMarkupRecommendation
) {
  return [
    {
      label: "Overhead",
      current: current.overhead_percent,
      recommended: markup.overhead_percent,
      reasoning: markup.overhead_reasoning,
    },
    {
      label: "Contingency",
      current: current.contingency_percent,
      recommended: markup.contingency_percent,
      reasoning: markup.contingency_reasoning,
    },
    {
      label: "Profit margin",
      current: current.profit_margin_percent,
      recommended: markup.profit_margin_percent,
      reasoning: markup.profit_margin_reasoning,
    },
  ];
}
