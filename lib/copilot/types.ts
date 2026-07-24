import type { EstimateBuilderState, EstimateCategory } from "@/lib/estimates/types";
import type { EstimateReviewContext } from "@/lib/ai/types";

/** Modules supported by the copilot layer (Phase 1: estimate only). */
export type CopilotModule =
  | "estimate"
  | "project"
  | "customer"
  | "proposal"
  | "analytics";

export type CopilotAnalysisMode = "review" | "suggest" | "ask";

export type CopilotRecommendationType =
  | "add_line_item"
  | "update_line_item"
  | "adjust_markup"
  | "pricing_warning"
  | "follow_up_action"
  | "budget_alert"
  | "business_insight";

export type CopilotRecommendationSeverity = "info" | "warning" | "critical";

export type CopilotRecommendationStatus = "pending" | "applied" | "dismissed";

export type CopilotReasoningSource =
  | "catalog"
  | "rules"
  | "llm"
  | "historical"
  | "benchmark";

export type CopilotReasoning = {
  source: CopilotReasoningSource;
  confidence: number;
  evidence?: string[];
};

export type CopilotAddLineItemPayload = {
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  catalog_item_id?: string | null;
  org_catalog_item_id?: string | null;
  related_line_item_id?: string | null;
};

export type CopilotUpdateLineItemPayload = {
  line_item_id: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
};

export type CopilotAdjustMarkupPayload = {
  overhead_percent?: number;
  contingency_percent?: number;
  profit_margin_percent?: number;
  /** Additive profit margin points (e.g. +3 means increase by 3%). */
  profit_margin_increase?: number;
  tax_percent?: number;
};

export type CopilotPricingWarningPayload = {
  line_item_id?: string | null;
  suggested_unit_cost?: number | null;
  message?: string;
};

export type CopilotInsightPayload = {
  message: string;
  href?: string | null;
};

export type CopilotRecommendationPayload =
  | CopilotAddLineItemPayload
  | CopilotUpdateLineItemPayload
  | CopilotAdjustMarkupPayload
  | CopilotPricingWarningPayload
  | CopilotInsightPayload;

export type CopilotRecommendation = {
  id: string;
  module: CopilotModule;
  entity_type: string;
  entity_id: string;
  recommendation_type: CopilotRecommendationType;
  severity: CopilotRecommendationSeverity;
  title: string;
  explanation: string;
  reasoning: CopilotReasoning;
  payload: CopilotRecommendationPayload;
  status: CopilotRecommendationStatus;
  created_at?: string;
  applied_at?: string | null;
  dismissed_at?: string | null;
};

export type CopilotHealthSummary = {
  score: number;
  status: "ready" | "review_required" | "not_ready";
  headline: string;
  highlights: string[];
};

export type CopilotAnalysisMeta = {
  module: CopilotModule;
  entity_type: string;
  entity_id: string;
  mode: CopilotAnalysisMode;
  source: "rules" | "openai" | "hybrid";
  ai_enabled: boolean;
  reviewed_at: string;
  summary: string;
};

export type CopilotAnalyzeResult = {
  meta: CopilotAnalysisMeta;
  recommendations: CopilotRecommendation[];
  health?: CopilotHealthSummary;
  legacy?: {
    /** Preserved for backward compatibility with existing estimate review UI. */
    review_result?: unknown;
  };
};

export type CopilotEstimateAnalyzeInput = {
  module: "estimate";
  mode: "review";
  entity_id: string;
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  previous_recommendation_refs?: Array<{
    id: string;
    title: string;
    category: string;
  }>;
};

export type CopilotAnalyzeInput = CopilotEstimateAnalyzeInput;

export type CopilotApplyInput = {
  module: CopilotModule;
  entity_type: string;
  entity_id: string;
  recommendation_ids: string[];
};

export type CopilotDismissInput = {
  module: CopilotModule;
  entity_type: string;
  entity_id: string;
  recommendation_ids: string[];
};

export type CopilotApplyResult = {
  applied_ids: string[];
  skipped_ids: string[];
  state?: EstimateBuilderState;
  saved_at?: string;
};

export type CopilotDismissResult = {
  dismissed_ids: string[];
};
