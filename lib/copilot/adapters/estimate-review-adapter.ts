import type {
  AiReviewActionType,
  AiReviewRecommendation,
  AiReviewResult,
} from "@/lib/ai/ai-review-service";
import type { LineItemCatalog } from "@/lib/estimates/line-item-catalogs/types";
import type { PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";
import {
  resolveCatalogLineItem,
  type CatalogResolverResult,
} from "@/lib/copilot/catalog-resolver";
import type {
  CopilotAddLineItemPayload,
  CopilotAdjustMarkupPayload,
  CopilotInsightPayload,
  CopilotPricingWarningPayload,
  CopilotReasoningSource,
  CopilotRecommendation,
  CopilotRecommendationPayload,
  CopilotRecommendationType,
  CopilotUpdateLineItemPayload,
} from "@/lib/copilot/types";

function mapReviewSource(source: AiReviewResult["source"]): CopilotReasoningSource {
  if (source === "openai") return "llm";
  if (source === "hybrid") return "llm";
  return "rules";
}

function inferRecommendationType(
  rec: AiReviewRecommendation
): CopilotRecommendationType {
  if (rec.actions.includes("increase_markup")) {
    return "adjust_markup";
  }

  if (rec.actions.includes("update_unit")) {
    return "update_line_item";
  }

  if (
    rec.actions.includes("add_material") ||
    rec.actions.includes("update_labor")
  ) {
    return "add_line_item";
  }

  if (rec.category === "pricing_concerns") {
    return "pricing_warning";
  }

  if (rec.category === "low_margin") {
    return "adjust_markup";
  }

  return "business_insight";
}

function buildMarkupPayload(rec: AiReviewRecommendation): CopilotAdjustMarkupPayload {
  if (rec.suggestedMarkupIncrease != null && rec.suggestedMarkupIncrease > 0) {
    return {
      profit_margin_increase: rec.suggestedMarkupIncrease,
    };
  }

  return {};
}

function buildAddLinePayload(
  rec: AiReviewRecommendation,
  resolved?: CatalogResolverResult
): CopilotAddLineItemPayload {
  const suggestion = rec.suggestedLineItem;

  if (resolved) {
    return {
      category: resolved.category,
      description: resolved.description,
      quantity: resolved.quantity,
      unit: resolved.unit,
      unit_cost: resolved.unit_cost,
      catalog_item_id: resolved.catalog_item_id,
      org_catalog_item_id: resolved.org_catalog_item_id,
      related_line_item_id: rec.relatedLineItemId ?? null,
    };
  }

  if (suggestion) {
    return {
      category: suggestion.category,
      description: suggestion.description,
      quantity: suggestion.quantity,
      unit: suggestion.unit,
      unit_cost: suggestion.unit_cost,
      related_line_item_id: rec.relatedLineItemId ?? null,
    };
  }

  const category =
    rec.actions.includes("update_labor") ? "labor" : "materials";

  return {
    category,
    description: rec.title,
    quantity: 1,
    unit: category === "labor" ? "hrs" : "ea",
    unit_cost: 0,
    related_line_item_id: rec.relatedLineItemId ?? null,
  };
}

function buildUpdateLinePayload(
  rec: AiReviewRecommendation
): CopilotUpdateLineItemPayload | null {
  if (!rec.relatedLineItemId) {
    return null;
  }

  return {
    line_item_id: rec.relatedLineItemId,
    unit_cost: rec.suggestedUnitCost,
  };
}

function buildPricingWarningPayload(
  rec: AiReviewRecommendation
): CopilotPricingWarningPayload {
  return {
    line_item_id: rec.relatedLineItemId ?? null,
    suggested_unit_cost: rec.suggestedUnitCost ?? null,
    message: rec.recommendedAction,
  };
}

function buildInsightPayload(rec: AiReviewRecommendation): CopilotInsightPayload {
  return {
    message: rec.recommendedAction || rec.explanation,
    href: null,
  };
}

function buildPayload(
  type: CopilotRecommendationType,
  rec: AiReviewRecommendation,
  resolved?: CatalogResolverResult
): CopilotRecommendationPayload {
  switch (type) {
    case "add_line_item":
      return buildAddLinePayload(rec, resolved);
    case "update_line_item":
      return buildUpdateLinePayload(rec) ?? buildInsightPayload(rec);
    case "adjust_markup":
      return buildMarkupPayload(rec);
    case "pricing_warning":
      return buildPricingWarningPayload(rec);
    default:
      return buildInsightPayload(rec);
  }
}

function catalogSourceFromMatch(
  match: CatalogResolverResult["match"]
): CopilotReasoningSource {
  if (match.source === "unresolved") {
    return "rules";
  }

  return "catalog";
}

export function adaptReviewRecommendationToCopilot(
  rec: AiReviewRecommendation,
  options: {
    entity_id: string;
    review_source: AiReviewResult["source"];
    catalogs?: Partial<Record<PickerCatalogCategory, LineItemCatalog>>;
  }
): CopilotRecommendation {
  const type = inferRecommendationType(rec);
  let resolved: CatalogResolverResult | undefined;

  if (type === "add_line_item") {
    const suggestion = rec.suggestedLineItem;
    const category =
      suggestion?.category ??
      (rec.actions.includes("update_labor") ? "labor" : "materials");

    resolved = resolveCatalogLineItem({
      category,
      description: suggestion?.description ?? rec.title,
      quantity: suggestion?.quantity,
      unit: suggestion?.unit,
      unit_cost: suggestion?.unit_cost,
      catalog:
        category === "labor" ||
        category === "materials" ||
        category === "equipment" ||
        category === "subcontractors"
          ? options.catalogs?.[category]
          : undefined,
    });
  }

  const reasoningSource =
    resolved ? catalogSourceFromMatch(resolved.match) : mapReviewSource(options.review_source);

  const evidence = [
    rec.reasoning,
    rec.businessImpact,
    resolved?.explanation,
  ].filter(Boolean) as string[];

  return {
    id: rec.id,
    module: "estimate",
    entity_type: "estimate",
    entity_id: options.entity_id,
    recommendation_type: type,
    severity: rec.severity,
    title: rec.title,
    explanation: rec.explanation,
    reasoning: {
      source: reasoningSource,
      confidence: resolved?.match.confidence ?? rec.confidence,
      evidence,
    },
    payload: buildPayload(type, rec, resolved),
    status: "pending",
  };
}

export function adaptReviewResultToCopilotRecommendations(
  result: AiReviewResult,
  entityId: string,
  catalogs?: Partial<Record<PickerCatalogCategory, LineItemCatalog>>
): CopilotRecommendation[] {
  return result.recommendations.map((rec) =>
    adaptReviewRecommendationToCopilot(rec, {
      entity_id: entityId,
      review_source: result.source,
      catalogs,
    })
  );
}

export function isActionableRecommendation(
  rec: CopilotRecommendation
): boolean {
  if (rec.recommendation_type === "business_insight") {
    return false;
  }

  if (rec.recommendation_type === "follow_up_action") {
    return false;
  }

  if (rec.recommendation_type === "budget_alert") {
    return false;
  }

  return true;
}

export function getPrimaryReviewAction(
  actions: AiReviewActionType[]
): AiReviewActionType | null {
  const priority: AiReviewActionType[] = [
    "add_material",
    "update_labor",
    "update_unit",
    "increase_markup",
  ];

  for (const action of priority) {
    if (actions.includes(action)) {
      return action;
    }
  }

  return actions[0] ?? null;
}
