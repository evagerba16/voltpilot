import type {
  CopilotReasoningSource,
  CopilotRecommendation,
  CopilotRecommendationType,
} from "@/lib/copilot/types";

const SOURCE_LABELS: Record<CopilotReasoningSource, string> = {
  catalog: "Catalog",
  rules: "Rules",
  llm: "AI",
  historical: "Historical",
  benchmark: "Benchmark",
};

const TYPE_LABELS: Record<CopilotRecommendationType, string> = {
  add_line_item: "Add line item",
  update_line_item: "Update line item",
  adjust_markup: "Adjust markup",
  pricing_warning: "Pricing review",
  follow_up_action: "Follow-up",
  budget_alert: "Budget alert",
  business_insight: "Insight",
};

export function formatCopilotSource(source: CopilotReasoningSource) {
  return SOURCE_LABELS[source] ?? source;
}

export function formatCopilotType(type: CopilotRecommendationType) {
  return TYPE_LABELS[type] ?? type;
}

export function formatConfidence(confidence: number) {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
}

export function formatRecommendationStatus(
  status: CopilotRecommendation["status"]
) {
  if (status === "applied") return "Applied";
  if (status === "dismissed") return "Dismissed";
  return "Pending";
}

export function getMetaSourceLabel(source: "rules" | "openai" | "hybrid") {
  if (source === "hybrid") return "Combined review";
  if (source === "openai") return "AI analysis";
  return "Standard review";
}
