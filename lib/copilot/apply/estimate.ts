import { buildLineItemFromSuggestion } from "@/lib/ai/ai-review-service";
import { isActionableRecommendation } from "@/lib/copilot/adapters/estimate-review-adapter";
import type {
  CopilotAddLineItemPayload,
  CopilotAdjustMarkupPayload,
  CopilotRecommendation,
  CopilotUpdateLineItemPayload,
} from "@/lib/copilot/types";
import type {
  EstimateBuilderState,
  EstimateLineItemInput,
} from "@/lib/estimates/types";

function applyAddLineItem(
  state: EstimateBuilderState,
  payload: CopilotAddLineItemPayload
): EstimateBuilderState {
  const maxSortOrder = state.line_items.reduce(
    (max, item) => Math.max(max, item.sort_order),
    -1
  );

  const lineItem = buildLineItemFromSuggestion(
    {
      category: payload.category,
      description: payload.description,
      quantity: payload.quantity,
      unit: payload.unit,
      unit_cost: payload.unit_cost,
    },
    maxSortOrder + 1
  );

  return {
    ...state,
    line_items: [...state.line_items, lineItem],
  };
}

function applyUpdateLineItem(
  state: EstimateBuilderState,
  payload: CopilotUpdateLineItemPayload
): EstimateBuilderState {
  return {
    ...state,
    line_items: state.line_items.map((item) => {
      if (item.id !== payload.line_item_id) {
        return item;
      }

      return {
        ...item,
        ...(payload.description !== undefined
          ? { description: payload.description }
          : {}),
        ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
        ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
        ...(payload.unit_cost !== undefined
          ? { unit_cost: payload.unit_cost }
          : {}),
      };
    }),
  };
}

function applyAdjustMarkup(
  state: EstimateBuilderState,
  payload: CopilotAdjustMarkupPayload
): EstimateBuilderState {
  const next = { ...state };

  if (payload.overhead_percent != null) {
    next.overhead_percent = payload.overhead_percent;
  }

  if (payload.contingency_percent != null) {
    next.contingency_percent = payload.contingency_percent;
  }

  if (payload.profit_margin_increase != null) {
    next.profit_margin_percent =
      state.profit_margin_percent + payload.profit_margin_increase;
  } else if (payload.profit_margin_percent != null) {
    next.profit_margin_percent = payload.profit_margin_percent;
  }

  if (payload.tax_percent != null) {
    next.tax_percent = payload.tax_percent;
  }

  return next;
}

export function applyCopilotRecommendationToEstimateState(
  state: EstimateBuilderState,
  recommendation: CopilotRecommendation
): EstimateBuilderState {
  switch (recommendation.recommendation_type) {
    case "add_line_item":
      return applyAddLineItem(
        state,
        recommendation.payload as CopilotAddLineItemPayload
      );
    case "update_line_item":
      return applyUpdateLineItem(
        state,
        recommendation.payload as CopilotUpdateLineItemPayload
      );
    case "adjust_markup":
      return applyAdjustMarkup(
        state,
        recommendation.payload as CopilotAdjustMarkupPayload
      );
    default:
      return state;
  }
}

export function applyCopilotRecommendationsToEstimateState(
  state: EstimateBuilderState,
  recommendations: CopilotRecommendation[]
) {
  const applied: string[] = [];
  const skipped: string[] = [];
  let nextState = state;

  for (const recommendation of recommendations) {
    if (!isActionableRecommendation(recommendation)) {
      skipped.push(recommendation.id);
      continue;
    }

    if (recommendation.status !== "pending") {
      skipped.push(recommendation.id);
      continue;
    }

    const updated = applyCopilotRecommendationToEstimateState(
      nextState,
      recommendation
    );

    if (updated === nextState) {
      skipped.push(recommendation.id);
      continue;
    }

    nextState = updated;
    applied.push(recommendation.id);
  }

  return { state: nextState, applied, skipped };
}

export function countLineItemsAdded(
  before: EstimateLineItemInput[],
  after: EstimateLineItemInput[]
) {
  return Math.max(0, after.length - before.length);
}
