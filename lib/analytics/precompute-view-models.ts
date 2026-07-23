import "server-only";

import { buildAnalyticsViewModel } from "@/lib/analytics/analytics-service";
import { buildAiInsightsViewModel } from "@/lib/analytics/ai-insights-service";
import { buildForecastViewModel } from "@/lib/analytics/forecast-service";
import type { AnalyticsData } from "@/lib/analytics/types";

const PIPELINE_COLORS: Record<string, string> = {
  Lead: "#94a3b8",
  Estimating: "#3b82f6",
  "Proposal Sent": "#f59e0b",
  Awarded: "#10b981",
  Lost: "#ef4444",
  Archived: "#64748b",
};

export function precomputeAnalyticsViewModels(data: AnalyticsData) {
  return {
    analytics: buildAnalyticsViewModel(data),
    forecasts: buildForecastViewModel(data),
    aiInsights: buildAiInsightsViewModel(data),
    pipelineWithColor: data.charts.projectPipeline.map((stage) => ({
      ...stage,
      fill: PIPELINE_COLORS[stage.status] ?? "#64748b",
    })),
  };
}

export type PrecomputedAnalyticsViewModels = ReturnType<
  typeof precomputeAnalyticsViewModels
>;
