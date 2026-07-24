export type {
  CopilotAnalyzeInput,
  CopilotAnalyzeResult,
  CopilotApplyInput,
  CopilotApplyResult,
  CopilotDismissInput,
  CopilotDismissResult,
  CopilotRecommendation,
  CopilotRecommendationPayload,
  CopilotRecommendationType,
} from "@/lib/copilot/types";

export {
  resolveCatalogLineItem,
  resolveCatalogLineItems,
} from "@/lib/copilot/catalog-resolver";

export {
  adaptReviewRecommendationToCopilot,
  adaptReviewResultToCopilotRecommendations,
} from "@/lib/copilot/adapters/estimate-review-adapter";

export { buildEstimateCopilotContext } from "@/lib/copilot/context/estimate";

export {
  runCopilotAnalysis,
  runCopilotApply,
  runCopilotDismiss,
} from "@/lib/copilot/orchestrator";

export {
  parseCopilotAnalyzeRequest,
  parseCopilotApplyRequest,
  parseCopilotDismissRequest,
} from "@/lib/copilot/api";

export {
  applyCopilotRecommendationsToEstimateState,
} from "@/lib/copilot/apply/estimate";
