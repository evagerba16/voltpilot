import type { EstimateReviewContext } from "@/lib/ai/types";
import { calculateEstimateTotals } from "@/lib/estimates/calculations";
import type { EstimateBuilderState } from "@/lib/estimates/types";

export type EstimateCopilotContext = {
  estimate_id: string;
  project_name: string;
  customer_name: string;
  project_type: string | null;
  project_address: string | null;
  line_item_count: number;
  category_counts: Record<string, number>;
  totals: ReturnType<typeof calculateEstimateTotals>;
  state: EstimateBuilderState;
  review_context: EstimateReviewContext;
};

export function buildEstimateCopilotContext(
  estimateId: string,
  state: EstimateBuilderState,
  context: EstimateReviewContext
): EstimateCopilotContext {
  const totals = calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    state.profit_margin_percent,
    state.tax_percent
  );

  const category_counts = state.line_items.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return {
    estimate_id: estimateId,
    project_name: context.projectName,
    customer_name: context.customerName,
    project_type: context.projectType ?? null,
    project_address: context.projectAddress ?? null,
    line_item_count: state.line_items.length,
    category_counts,
    totals,
    state,
    review_context: context,
  };
}

export function serializeEstimateCopilotContextForLog(
  context: EstimateCopilotContext
) {
  return {
    estimate_id: context.estimate_id,
    project_name: context.project_name,
    customer_name: context.customer_name,
    line_item_count: context.line_item_count,
    direct_cost: context.totals.directCost,
    final_selling_price: context.totals.finalSellingPrice,
  };
}
