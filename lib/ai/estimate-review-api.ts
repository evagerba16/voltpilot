import {
  runAiReview,
  type AiReviewCategory,
  type AiReviewPayload,
  type AiReviewResult,
} from "@/lib/ai/ai-review-service";
import type { EstimateReviewContext } from "@/lib/ai/types";
import { verifyEstimateOwnership } from "@/lib/estimates/queries";
import type { EstimateBuilderState } from "@/lib/estimates/types";

export type EstimateReviewRequestBody = {
  estimateId: string;
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  previousRecommendations?: Array<{
    id: string;
    title: string;
    category: AiReviewCategory;
  }>;
};

const VALID_REVIEW_CATEGORIES = new Set<AiReviewCategory>([
  "missing_materials",
  "missing_labor",
  "duplicate_items",
  "pricing_concerns",
  "low_margin",
  "scope_gaps",
  "estimator_questions",
]);

function normalizePreviousRecommendations(
  value: EstimateReviewRequestBody["previousRecommendations"]
) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter(
      (item) =>
        item?.id &&
        item.title?.trim() &&
        VALID_REVIEW_CATEGORIES.has(item.category as AiReviewCategory)
    )
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      category: item.category as AiReviewCategory,
    }));

  return normalized.length > 0 ? normalized : undefined;
}

export type EstimateReviewApiSuccess = {
  result: AiReviewResult;
};

export type EstimateReviewJsonResponse = AiReviewResult;

export type EstimateReviewApiFailure = {
  error: string;
  status: number;
};

export type EstimateReviewApiResponse =
  | EstimateReviewApiSuccess
  | EstimateReviewApiFailure;

export function isEstimateReviewFailure(
  response: EstimateReviewApiResponse
): response is EstimateReviewApiFailure {
  return "error" in response;
}

export function parseEstimateReviewRequest(
  body: unknown
): { payload: AiReviewPayload; estimateId: string } | EstimateReviewApiFailure {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required.", status: 400 };
  }

  const record = body as Partial<EstimateReviewRequestBody>;

  if (!record.estimateId?.trim()) {
    return { error: "estimateId is required.", status: 400 };
  }

  if (!record.state?.line_items || !Array.isArray(record.state.line_items)) {
    return { error: "state with line_items is required.", status: 400 };
  }

  if (!record.context?.projectName?.trim() || !record.context.customerName?.trim()) {
    return { error: "context.projectName and context.customerName are required.", status: 400 };
  }

  return {
    estimateId: record.estimateId,
    payload: {
      state: record.state,
      context: {
        projectName: record.context.projectName,
        customerName: record.context.customerName,
        projectType: record.context.projectType ?? null,
        projectAddress: record.context.projectAddress ?? null,
      },
      previousRecommendations: normalizePreviousRecommendations(
        record.previousRecommendations
      ),
    },
  };
}

export async function executeEstimateReview(
  organizationId: string,
  estimateId: string,
  payload: AiReviewPayload
): Promise<EstimateReviewApiResponse> {
  const ownsEstimate = await verifyEstimateOwnership(estimateId, organizationId);

  if (!ownsEstimate) {
    return { error: "Estimate was not found.", status: 404 };
  }

  try {
    const result = await runAiReview(payload);
    return { result };
  } catch (error) {
    return {
      error:
        error instanceof Error ?
          error.message
        : "Unable to run AI estimate review.",
      status: 500,
    };
  }
}
