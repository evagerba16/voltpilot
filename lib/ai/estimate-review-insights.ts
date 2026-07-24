import {
  analyzeEstimateReviewContext,
  type EstimateReviewAnalysis,
  type ProjectTypeProfile,
} from "@/lib/ai/internal/estimate-review-analyzer";
import type { EstimateReviewContext } from "@/lib/ai/types";
import {
  calculateEstimateTotals,
  formatCurrency,
} from "@/lib/estimates/calculations";
import type { EstimateBuilderState } from "@/lib/estimates/types";

export type EstimateReviewInsightKind = "warning" | "opportunity" | "success" | "info";

export type EstimateReviewInsightAction =
  | { type: "increase_markup"; targetPercent: number }
  | { type: "open_full_review" };

export type EstimateReviewInsight = {
  id: string;
  kind: EstimateReviewInsightKind;
  message: string;
  priority: number;
  action?: EstimateReviewInsightAction;
};

export type EstimateReviewInsightsResult = {
  insights: EstimateReviewInsight[];
  analysis: EstimateReviewAnalysis;
  hasActiveLineItems: boolean;
};

type ProjectBenchmark = {
  materialShareMedian: number;
  typicalGrossMarginPercent: number;
  targetProfitMarginPercent: number;
  panelReplacementMinHours: number;
};

const PROJECT_BENCHMARKS: Record<ProjectTypeProfile, ProjectBenchmark> = {
  multifamily: {
    materialShareMedian: 0.38,
    typicalGrossMarginPercent: 27,
    targetProfitMarginPercent: 22,
    panelReplacementMinHours: 12,
  },
  service_call: {
    materialShareMedian: 0.42,
    typicalGrossMarginPercent: 32,
    targetProfitMarginPercent: 25,
    panelReplacementMinHours: 6,
  },
  commercial_ti: {
    materialShareMedian: 0.4,
    typicalGrossMarginPercent: 25,
    targetProfitMarginPercent: 20,
    panelReplacementMinHours: 16,
  },
  new_construction: {
    materialShareMedian: 0.36,
    typicalGrossMarginPercent: 22,
    targetProfitMarginPercent: 18,
    panelReplacementMinHours: 24,
  },
  industrial: {
    materialShareMedian: 0.34,
    typicalGrossMarginPercent: 24,
    targetProfitMarginPercent: 20,
    panelReplacementMinHours: 32,
  },
  healthcare: {
    materialShareMedian: 0.35,
    typicalGrossMarginPercent: 26,
    targetProfitMarginPercent: 21,
    panelReplacementMinHours: 24,
  },
  education: {
    materialShareMedian: 0.37,
    typicalGrossMarginPercent: 24,
    targetProfitMarginPercent: 19,
    panelReplacementMinHours: 20,
  },
  retail: {
    materialShareMedian: 0.39,
    typicalGrossMarginPercent: 25,
    targetProfitMarginPercent: 20,
    panelReplacementMinHours: 14,
  },
  general_commercial: {
    materialShareMedian: 0.37,
    typicalGrossMarginPercent: 27,
    targetProfitMarginPercent: 22,
    panelReplacementMinHours: 18,
  },
};

function getBenchmark(projectType: ProjectTypeProfile) {
  return PROJECT_BENCHMARKS[projectType];
}

function hasPanelReplacementScope(analysis: EstimateReviewAnalysis) {
  const scope = analysis.scopeText;

  return (
    analysis.scopeSignals.hasPanelWork ||
    scope.includes("panel upgrade") ||
    scope.includes("panel replacement") ||
    scope.includes("sub panel") ||
    scope.includes("subpanel") ||
    scope.includes("distribution panel")
  );
}

function buildMaterialCostInsight(
  analysis: EstimateReviewAnalysis,
  benchmark: ProjectBenchmark
): EstimateReviewInsight | null {
  if (
    analysis.categoryTotals.materials < 500 ||
    analysis.totals.directCost <= 0 ||
    analysis.activeLineItemCount === 0
  ) {
    return null;
  }

  const actualShare = analysis.materialShareOfDirectCost;
  const benchmarkShare = benchmark.materialShareMedian;

  if (benchmarkShare <= 0) {
    return null;
  }

  const diffPercent = ((actualShare - benchmarkShare) / benchmarkShare) * 100;

  if (Math.abs(diffPercent) < 8) {
    return null;
  }

  const rounded = Math.round(Math.abs(diffPercent));

  if (diffPercent > 0) {
    return {
      id: "material-cost-high",
      kind: "warning",
      priority: 90,
      message: `Material costs are ${rounded}% higher than similar projects.`,
    };
  }

  return {
    id: "material-cost-low",
    kind: "info",
    priority: 55,
    message: `Material costs are ${rounded}% lower than similar projects — confirm buyout and scope completeness.`,
  };
}

function buildPanelLaborInsight(
  analysis: EstimateReviewAnalysis,
  benchmark: ProjectBenchmark
): EstimateReviewInsight | null {
  if (!hasPanelReplacementScope(analysis) || analysis.laborHours <= 0) {
    return null;
  }

  const minHours = benchmark.panelReplacementMinHours;

  if (analysis.laborHours >= minHours) {
    return null;
  }

  const label =
    analysis.scopeText.includes("sub panel") || analysis.scopeText.includes("subpanel") ?
      "a sub panel installation"
    : "a panel replacement";

  return {
    id: "panel-labor-low",
    kind: "warning",
    priority: 95,
    message: `Labor hours appear low for ${label}.`,
  };
}

function buildMarkupOpportunityInsight(
  state: EstimateBuilderState,
  analysis: EstimateReviewAnalysis,
  benchmark: ProjectBenchmark
): EstimateReviewInsight | null {
  if (analysis.totals.finalSellingPrice < 2500 || analysis.activeLineItemCount === 0) {
    return null;
  }

  const currentMarkup = state.profit_margin_percent;
  const targetMarkup = Math.max(
    benchmark.targetProfitMarginPercent,
    Number((currentMarkup + 4).toFixed(1))
  );

  if (targetMarkup <= currentMarkup + 0.4) {
    return null;
  }

  const projectedTotals = calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    targetMarkup,
    state.tax_percent
  );

  const profitDelta = projectedTotals.profitAmount - analysis.totals.profitAmount;

  if (profitDelta < 150) {
    return null;
  }

  return {
    id: "markup-opportunity",
    kind: "opportunity",
    priority: 85,
    message: `Increasing markup from ${currentMarkup.toFixed(0)}% to ${targetMarkup.toFixed(0)}% would increase profit by approximately ${formatCurrency(profitDelta)}.`,
    action: {
      type: "increase_markup",
      targetPercent: targetMarkup,
    },
  };
}

function buildSimilarJobsMarginInsight(
  analysis: EstimateReviewAnalysis,
  benchmark: ProjectBenchmark
): EstimateReviewInsight | null {
  if (analysis.totals.finalSellingPrice < 1000 || analysis.activeLineItemCount === 0) {
    return null;
  }

  const benchmarkMargin = benchmark.typicalGrossMarginPercent;
  const currentMargin = analysis.grossMarginPercent;
  const withinRange = currentMargin >= benchmarkMargin - 3;

  if (withinRange) {
    return {
      id: "similar-jobs-margin-healthy",
      kind: "success",
      priority: 40,
      message: `Similar jobs averaged a ${benchmarkMargin}% margin.`,
    };
  }

  return {
    id: "similar-jobs-margin-low",
    kind: "warning",
    priority: 80,
    message: `Similar jobs averaged a ${benchmarkMargin}% margin — this estimate is at ${currentMargin.toFixed(0)}%.`,
    action: { type: "open_full_review" },
  };
}

function buildLaborMaterialRatioInsight(
  analysis: EstimateReviewAnalysis
): EstimateReviewInsight | null {
  if (
    analysis.laborToMaterialRatio === null ||
    analysis.categoryTotals.materials < 2500 ||
    analysis.laborHours <= 0
  ) {
    return null;
  }

  if (analysis.laborToMaterialRatio >= 0.18) {
    return null;
  }

  return {
    id: "labor-material-ratio",
    kind: "warning",
    priority: 88,
    message: "Labor appears light relative to material scope for this project type.",
    action: { type: "open_full_review" },
  };
}

export function buildEstimateReviewInsights(
  state: EstimateBuilderState,
  context: EstimateReviewContext
): EstimateReviewInsightsResult {
  const analysis = analyzeEstimateReviewContext(state, context);
  const benchmark = getBenchmark(analysis.projectType);
  const hasActiveLineItems = analysis.activeLineItemCount > 0;

  if (!hasActiveLineItems) {
    return {
      insights: [],
      analysis,
      hasActiveLineItems: false,
    };
  }

  const candidates = [
    buildMaterialCostInsight(analysis, benchmark),
    buildPanelLaborInsight(analysis, benchmark),
    buildLaborMaterialRatioInsight(analysis),
    buildMarkupOpportunityInsight(state, analysis, benchmark),
    buildSimilarJobsMarginInsight(analysis, benchmark),
  ].filter((item): item is EstimateReviewInsight => item !== null);

  const insights = candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  return {
    insights,
    analysis,
    hasActiveLineItems,
  };
}
