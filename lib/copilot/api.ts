import type { EstimateReviewContext } from "@/lib/ai/types";
import type {
  CopilotAnalyzeInput,
  CopilotApplyInput,
  CopilotDismissInput,
} from "@/lib/copilot/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";

type ApiFailure = { error: string; status: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseReviewContext(value: unknown): EstimateReviewContext | ApiFailure {
  if (!isRecord(value)) {
    return { error: "context is required.", status: 400 };
  }

  const projectName = String(value.projectName ?? "").trim();
  const customerName = String(value.customerName ?? "").trim();

  if (!projectName || !customerName) {
    return {
      error: "context.projectName and context.customerName are required.",
      status: 400,
    };
  }

  return {
    projectName,
    customerName,
    projectType:
      value.projectType === null || value.projectType === undefined
        ? null
        : String(value.projectType),
    projectAddress:
      value.projectAddress === null || value.projectAddress === undefined
        ? null
        : String(value.projectAddress),
  };
}

function parseEstimateState(value: unknown): EstimateBuilderState | ApiFailure {
  if (!isRecord(value) || !Array.isArray(value.line_items)) {
    return { error: "state with line_items is required.", status: 400 };
  }

  return value as EstimateBuilderState;
}

export function parseCopilotAnalyzeRequest(
  body: unknown
): CopilotAnalyzeInput | ApiFailure {
  if (!isRecord(body)) {
    return { error: "Request body is required.", status: 400 };
  }

  const copilotModule = String(body.module ?? "estimate");
  const mode = String(body.mode ?? "review");
  const entityId = String(body.entity_id ?? body.estimateId ?? "").trim();

  if (copilotModule !== "estimate") {
    return { error: "Phase 1 supports module=estimate only.", status: 400 };
  }

  if (mode !== "review") {
    return { error: "Phase 1 supports mode=review only.", status: 400 };
  }

  if (!entityId) {
    return { error: "entity_id is required.", status: 400 };
  }

  const stateResult = parseEstimateState(body.state);
  if ("error" in stateResult) {
    return stateResult;
  }

  const contextResult = parseReviewContext(body.context);
  if ("error" in contextResult) {
    return contextResult;
  }

  const previousRefs = Array.isArray(body.previous_recommendation_refs)
    ? body.previous_recommendation_refs
        .filter(isRecord)
        .map((ref) => ({
          id: String(ref.id ?? ""),
          title: String(ref.title ?? ""),
          category: String(ref.category ?? ""),
        }))
        .filter((ref) => ref.id && ref.title)
    : undefined;

  return {
    module: "estimate",
    mode: "review",
    entity_id: entityId,
    state: stateResult,
    context: contextResult,
    previous_recommendation_refs: previousRefs,
  };
}

function parseEntityRequest(body: unknown): {
  module: CopilotApplyInput["module"];
  entity_type: string;
  entity_id: string;
  recommendation_ids: string[];
} | ApiFailure {
  if (!isRecord(body)) {
    return { error: "Request body is required.", status: 400 };
  }

  const copilotModule = String(body.module ?? "estimate") as CopilotApplyInput["module"];
  const entityType = String(body.entity_type ?? "estimate");
  const entityId = String(body.entity_id ?? body.estimateId ?? "").trim();
  const ids = Array.isArray(body.recommendation_ids)
    ? body.recommendation_ids.map(String).filter(Boolean)
    : [];

  if (!entityId) {
    return { error: "entity_id is required.", status: 400 };
  }

  if (ids.length === 0) {
    return { error: "recommendation_ids is required.", status: 400 };
  }

  return {
    module: copilotModule,
    entity_type: entityType,
    entity_id: entityId,
    recommendation_ids: ids,
  };
}

export function parseCopilotApplyRequest(
  body: unknown
): CopilotApplyInput | ApiFailure {
  const parsed = parseEntityRequest(body);
  if ("error" in parsed) {
    return parsed;
  }

  return parsed;
}

export function parseCopilotDismissRequest(
  body: unknown
): CopilotDismissInput | ApiFailure {
  const parsed = parseEntityRequest(body);
  if ("error" in parsed) {
    return parsed;
  }

  return parsed;
}

export function isCopilotApiFailure(
  value: unknown
): value is ApiFailure {
  return isRecord(value) && typeof value.error === "string";
}
