import "server-only";

import { runAiReview } from "@/lib/ai/ai-review-service";
import { adaptReviewResultToCopilotRecommendations } from "@/lib/copilot/adapters/estimate-review-adapter";
import { buildEstimateCopilotContext } from "@/lib/copilot/context/estimate";
import { mergeEquipmentCatalog } from "@/lib/estimates/org-catalog/merge-equipment";
import { getOrganizationCatalogItems } from "@/lib/estimates/org-catalog/queries";
import type { LineItemCatalog } from "@/lib/estimates/line-item-catalogs/types";
import type { PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";
import {
  getCopilotRecommendationsByIds,
  replaceCopilotRecommendations,
  updateCopilotRecommendationStatuses,
} from "@/lib/copilot/queries";
import type {
  CopilotAnalyzeInput,
  CopilotAnalyzeResult,
  CopilotApplyInput,
  CopilotApplyResult,
  CopilotDismissInput,
  CopilotDismissResult,
} from "@/lib/copilot/types";
import {
  getEstimateById,
  mapEstimateToBuilderState,
  verifyEstimateOwnership,
} from "@/lib/estimates/queries";
import { NotFoundError } from "@/lib/auth/permission-errors";
import { saveAiEstimateVersion } from "@/app/(dashboard)/estimates/actions";
import { applyCopilotRecommendationsToEstimateState } from "@/lib/copilot/apply/estimate";

async function loadEquipmentCatalogForOrg(
  organizationId: string
): Promise<LineItemCatalog | undefined> {
  try {
    const overrides = await getOrganizationCatalogItems(organizationId, "equipment");
    return mergeEquipmentCatalog(overrides);
  } catch {
    return undefined;
  }
}

async function buildCatalogMap(
  organizationId: string
): Promise<Partial<Record<PickerCatalogCategory, LineItemCatalog>>> {
  const equipment = await loadEquipmentCatalogForOrg(organizationId);

  return equipment ? { equipment } : {};
}

export async function runCopilotAnalysis(
  organizationId: string,
  userId: string,
  input: CopilotAnalyzeInput
): Promise<CopilotAnalyzeResult> {
  if (input.module !== "estimate" || input.mode !== "review") {
    throw new Error(
      "Phase 1 supports module=estimate and mode=review only."
    );
  }

  const ownsEstimate = await verifyEstimateOwnership(
    input.entity_id,
    organizationId
  );

  if (!ownsEstimate) {
    throw new NotFoundError("Estimate was not found.");
  }

  buildEstimateCopilotContext(input.entity_id, input.state, input.context);

  const reviewResult = await runAiReview({
    state: input.state,
    context: input.context,
    previousRecommendations: input.previous_recommendation_refs?.map((ref) => ({
      id: ref.id,
      title: ref.title,
      category: ref.category as never,
    })),
  });

  const catalogs = await buildCatalogMap(organizationId);
  const recommendations = adaptReviewResultToCopilotRecommendations(
    reviewResult,
    input.entity_id,
    catalogs
  );

  const persisted = await replaceCopilotRecommendations(
    organizationId,
    userId,
    "estimate",
    input.entity_id,
    recommendations
  );

  return {
    meta: {
      module: "estimate",
      entity_type: "estimate",
      entity_id: input.entity_id,
      mode: "review",
      source: reviewResult.source,
      ai_enabled: reviewResult.aiEnabled,
      reviewed_at: reviewResult.reviewedAt,
      summary: reviewResult.summary,
    },
    recommendations: persisted,
    health: {
      score: reviewResult.health.score,
      status: reviewResult.health.status,
      headline: reviewResult.health.headline,
      highlights: reviewResult.health.highlights,
    },
    legacy: {
      review_result: reviewResult,
    },
  };
}

export async function runCopilotApply(
  organizationId: string,
  input: CopilotApplyInput
): Promise<CopilotApplyResult> {
  if (input.module !== "estimate" || input.entity_type !== "estimate") {
    throw new Error("Phase 1 apply supports estimate entities only.");
  }

  const ownsEstimate = await verifyEstimateOwnership(
    input.entity_id,
    organizationId
  );

  if (!ownsEstimate) {
    throw new NotFoundError("Estimate was not found.");
  }

  const estimateResult = await getEstimateById(input.entity_id);

  if (!estimateResult) {
    throw new NotFoundError("Estimate was not found.");
  }

  const currentState = mapEstimateToBuilderState(
    estimateResult.estimate,
    estimateResult.lineItems
  );

  const recommendations = await getCopilotRecommendationsByIds(
    organizationId,
    input.entity_type,
    input.entity_id,
    input.recommendation_ids
  );

  if (recommendations.length === 0) {
    return { applied_ids: [], skipped_ids: input.recommendation_ids };
  }

  const { state: nextState, applied, skipped } =
    applyCopilotRecommendationsToEstimateState(currentState, recommendations);

  if (applied.length === 0) {
    return { applied_ids: [], skipped_ids: skipped };
  }

  const saveResult = await saveAiEstimateVersion(input.entity_id, nextState);

  if ("error" in saveResult && saveResult.error) {
    throw new Error(saveResult.error);
  }

  await updateCopilotRecommendationStatuses(
    organizationId,
    applied,
    "applied",
    { entity_type: input.entity_type, entity_id: input.entity_id }
  );

  return {
    applied_ids: applied,
    skipped_ids: skipped,
    state: nextState,
    saved_at: new Date().toISOString(),
  };
}

export async function runCopilotDismiss(
  organizationId: string,
  input: CopilotDismissInput
): Promise<CopilotDismissResult> {
  if (input.module !== "estimate" || input.entity_type !== "estimate") {
    throw new Error("Phase 1 dismiss supports estimate entities only.");
  }

  const ownsEstimate = await verifyEstimateOwnership(
    input.entity_id,
    organizationId
  );

  if (!ownsEstimate) {
    throw new NotFoundError("Estimate was not found.");
  }

  const dismissed = await updateCopilotRecommendationStatuses(
    organizationId,
    input.recommendation_ids,
    "dismissed",
    { entity_type: input.entity_type, entity_id: input.entity_id }
  );

  return { dismissed_ids: dismissed };
}
