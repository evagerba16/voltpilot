import {
  runAiReview,
  type AiReviewCategory,
  type AiReviewResult,
} from "@/lib/ai/ai-review-service";
import type {
  AiEstimateReviewPayload,
  AiEstimateReviewResult,
} from "@/lib/ai/types";
import type {
  ReviewSuggestion,
  ReviewSuggestionCategory,
} from "@/lib/estimates/review";

function reverseCategory(category: AiReviewCategory): ReviewSuggestionCategory {
  switch (category) {
    case "missing_materials":
      return "missing_materials";
    case "missing_labor":
      return "missing_labor";
    case "duplicate_items":
      return "duplicate_items";
    case "pricing_concerns":
      return "inconsistent_pricing";
    case "low_margin":
      return "low_margin";
    case "scope_gaps":
      return "estimating_risks";
    case "estimator_questions":
      return "pre_proposal";
  }
}

function toLegacySuggestions(
  result: AiReviewResult
): ReviewSuggestion[] {
  return result.recommendations.map((item) => ({
    id: item.id,
    category: reverseCategory(item.category),
    severity: item.severity,
    title: item.title,
    description: item.explanation,
  }));
}

function toLegacyResult(result: AiReviewResult): AiEstimateReviewResult {
  return {
    suggestions: toLegacySuggestions(result),
    summary: result.summary,
    reviewedAt: result.reviewedAt,
    source: result.source === "openai" ? "hybrid" : result.source,
    aiEnabled: result.aiEnabled,
  };
}

/** @deprecated Prefer runAiReview from ai-review-service for structured recommendations. */
export async function runAiEstimateReview(
  payload: AiEstimateReviewPayload
): Promise<AiEstimateReviewResult> {
  const result = await runAiReview(payload);
  return toLegacyResult(result);
}

export { runAiReview } from "@/lib/ai/ai-review-service";
