import type { EstimateReviewResult } from "@/lib/estimates/review";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import type { ProposalEditorState } from "@/lib/proposals/types";

export type AiSource = "rules" | "openai" | "hybrid";

export type EstimateReviewContext = {
  projectName: string;
  customerName: string;
  projectType?: string | null;
  projectAddress?: string | null;
};

export type AiEstimateReviewResult = EstimateReviewResult & {
  source: AiSource;
  aiEnabled: boolean;
};

export type ProposalAssistantTask =
  | "scope_of_work"
  | "rewrite_professional"
  | "improve_clarity"
  | "project_summary"
  | "exclusions"
  | "assumptions";

export type ProposalAssistantContext = {
  projectName: string;
  customerName: string;
  companyName: string;
  estimateSnapshot?: {
    selling_price: number;
    gross_margin_percent: number;
    line_items_by_category: Record<
      string,
      Array<{ description: string; quantity: number; unit: string; total: number }>
    >;
  } | null;
};

export type ProposalAssistantResult = {
  field: keyof ProposalEditorState;
  label: string;
  content: string;
  source: AiSource;
  aiEnabled: boolean;
};

export type ProjectInsight = {
  id: string;
  category: "complexity" | "cost_risk" | "profitability" | "pricing" | "action";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
};

export type ProjectInsightsResult = {
  complexityScore: number;
  complexityLabel: string;
  insights: ProjectInsight[];
  summary: string;
  source: AiSource;
  aiEnabled: boolean;
};

export type DashboardInsightItem = {
  id: string;
  type:
    | "review_required"
    | "low_margin"
    | "missing_info"
    | "high_risk"
    | "recommended_action";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  href: string;
  entityLabel: string;
};

export type DashboardInsightsData = {
  items: DashboardInsightItem[];
  summary: string;
  counts: {
    reviewRequired: number;
    lowMargin: number;
    missingInfo: number;
    highRisk: number;
    recommendedActions: number;
  };
  aiEnabled: boolean;
  source: AiSource;
};

export type AiEstimateReviewPayload = {
  state: EstimateBuilderState;
  context: EstimateReviewContext;
};

export type AiProposalAssistantPayload = {
  task: ProposalAssistantTask;
  currentState: ProposalEditorState;
  context: ProposalAssistantContext;
};

export type AiProjectInsightsPayload = {
  projectId: string;
};

export type AiEstimateLineItemRecommendation = {
  category: "labor" | "materials" | "equipment" | "subcontractors" | "miscellaneous";
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  reasoning: string;
};

export type AiEstimateMarkupRecommendation = {
  overhead_percent: number;
  contingency_percent: number;
  profit_margin_percent: number;
  overhead_reasoning: string;
  contingency_reasoning: string;
  profit_margin_reasoning: string;
};

export type AiEstimateAssistantRecommendation = {
  summary: string;
  explanation: string;
  line_items: AiEstimateLineItemRecommendation[];
  markup: AiEstimateMarkupRecommendation;
};

export type AiEstimateAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations: AiEstimateAssistantRecommendation | null;
  created_at: string;
};

export type AiEstimateAssistantSession = {
  id: string;
  estimate_id: string;
  messages: AiEstimateAssistantMessage[];
};

export type AiEstimateAssistantContext = EstimateReviewContext & {
  projectType?: string | null;
};

export type AiEstimateAssistantPayload = {
  estimateId: string;
  userMessage: string;
  state: EstimateBuilderState;
  context: AiEstimateAssistantContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};
