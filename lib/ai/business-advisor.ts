import "server-only";

import type { DashboardInsightsData } from "@/lib/ai/types";
import {
  buildAiInsightsViewModel,
  type AiOpportunity,
} from "@/lib/analytics/ai-insights-service";
import { buildAnalyticsViewModel } from "@/lib/analytics/analytics-service";
import { buildForecastViewModel, compareRevenueTrend } from "@/lib/analytics/forecast-service";
import { deriveGrossMarginTrend } from "@/lib/analytics/chart-helpers";
import { getForecastWinProbability } from "@/lib/analytics/internal/forecast-probability";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsData, TimeSeriesPoint } from "@/lib/analytics/types";
import {
  resolveActionCta,
  resolveInsightActionLabel,
} from "@/lib/ai/volt-ai-theme";

export type VoltAiHistoricalTrends = {
  revenueTrend: TimeSeriesPoint[];
  profitTrend: TimeSeriesPoint[];
  winRateTrend: TimeSeriesPoint[];
  estimateVolumeTrend: TimeSeriesPoint[];
};

export type VoltAiInsightTone = "warning" | "success" | "info" | "opportunity";

export type VoltAiKeyInsight = {
  id: string;
  tone: VoltAiInsightTone;
  emoji: string;
  title: string;
  subtitle: string;
  metricLabel?: string;
  metricValue?: string;
  actionLabel: string;
  href: string;
};

export type VoltAiRecommendedAction = {
  id: string;
  label: string;
  href: string;
  ctaLabel: string;
  priority: "high" | "medium";
};

export type VoltAiForecastTile = {
  id: string;
  title: string;
  value: string;
  numericValue?: number | null;
  changePercent: number | null;
  changeDirection: "up" | "down" | "flat" | null;
  periodLabel: string;
  hint: string;
};

export type VoltAiHealthTrend = "up" | "down" | "flat";

export type VoltAiHealthIndicator = {
  id: string;
  label: string;
  trend: VoltAiHealthTrend;
};

export type VoltAiBusinessHealth = {
  score: number;
  rating: string;
  indicators: VoltAiHealthIndicator[];
};

export type VoltAiPerformanceMetric = {
  id: string;
  label: string;
  value: string;
  numericValue: number | null;
  suffix?: string;
  trend: VoltAiHealthTrend | null;
  trendPercent: number | null;
};

export type VoltAiPerformanceMetrics = {
  metrics: VoltAiPerformanceMetric[];
};

export type VoltAiAdvisorViewModel = {
  businessHealth: VoltAiBusinessHealth;
  generatedAt: string;
  aiEnabled: boolean;
  summary: string;
  keyInsights: VoltAiKeyInsight[];
  forecastTiles: VoltAiForecastTile[];
  recommendedActions: VoltAiRecommendedAction[];
  performance: VoltAiPerformanceMetrics;
  suggestedPrompts: string[];
  historicalTrends: VoltAiHistoricalTrends;
  isEmpty: boolean;
};

const SUGGESTED_PROMPTS = [
  "Analyze my margins",
  "Find my most profitable customer",
  "Show jobs at risk",
  "Predict next month's revenue",
  "Review my pipeline",
] as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeBusinessHealthScore(
  data: AnalyticsData,
  openFollowUpCount: number,
  dashboardInsights: DashboardInsightsData
) {
  let score = 100;

  if (data.executive.grossMarginPercent > 0) {
    if (data.executive.grossMarginPercent < 15) {
      score -= Math.min(25, (15 - data.executive.grossMarginPercent) * 2);
    }
  } else if (data.executive.totalEstimates > 0) {
    score -= 10;
  }

  if (data.executive.totalProposals >= 3 && data.executive.winRate < 40) {
    score -= Math.min(20, (40 - data.executive.winRate) * 0.5);
  }

  score -= Math.min(15, openFollowUpCount * 4);
  score -= Math.min(
    20,
    dashboardInsights.counts.lowMargin * 2 +
      dashboardInsights.counts.highRisk * 4 +
      dashboardInsights.counts.reviewRequired
  );

  if (data.executive.pipelineValue <= 0 && data.executive.totalEstimates === 0) {
    score = Math.min(score, 45);
  } else if (data.executive.pipelineValue > 0) {
    score += 3;
  }

  if (data.executive.grossMarginPercent >= 20 && data.executive.winRate >= 45) {
    score += 5;
  }

  return clampScore(score);
}

function healthRating(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "At risk";
}

function healthTrendFromSeries(
  points: AnalyticsData["charts"]["revenueTrend"]
): VoltAiHealthTrend {
  const comparison = compareRevenueTrend(points);
  if (!comparison) {
    return "flat";
  }

  return comparison.direction;
}

function healthTrendFromValues(points: Array<{ value: number }>): VoltAiHealthTrend {
  if (points.length < 2) {
    return "flat";
  }

  const recent = points.slice(-3);
  const latest = recent[recent.length - 1]?.value ?? 0;
  const prior = recent[0]?.value ?? 0;

  if (prior <= 0 && latest <= 0) {
    return "flat";
  }

  if (prior <= 0) {
    return "up";
  }

  const changePercent = ((latest - prior) / prior) * 100;

  if (changePercent >= 2) {
    return "up";
  }

  if (changePercent <= -2) {
    return "down";
  }

  return "flat";
}

function buildBusinessHealth(
  data: AnalyticsData,
  openFollowUpCount: number,
  dashboardInsights: DashboardInsightsData
): VoltAiBusinessHealth {
  const score = computeBusinessHealthScore(
    data,
    openFollowUpCount,
    dashboardInsights
  );
  const marginTrendPoints = deriveGrossMarginTrend(
    data.charts.revenueTrend,
    data.charts.profitTrend
  );

  return {
    score,
    rating: healthRating(score),
    indicators: [
      {
        id: "revenue",
        label: "Revenue",
        trend: healthTrendFromSeries(data.charts.revenueTrend),
      },
      {
        id: "profit",
        label: "Profit",
        trend: healthTrendFromSeries(data.charts.profitTrend),
      },
      {
        id: "customer-growth",
        label: "Customer Growth",
        trend: healthTrendFromSeries(data.charts.customerGrowthTrend),
      },
      {
        id: "margins",
        label: "Margins",
        trend: healthTrendFromValues(marginTrendPoints),
      },
    ],
  };
}

function annualizedImpact(amount: number) {
  if (amount <= 0) {
    return null;
  }

  return formatCurrency(amount * 4);
}

function seriesTrend(
  points: Array<{ value: number }>
): { direction: VoltAiHealthTrend; changePercent: number } | null {
  if (points.length < 2) {
    return null;
  }

  const recent = points.slice(-3);
  const latest = recent[recent.length - 1]?.value ?? 0;
  const prior = recent[0]?.value ?? 0;

  if (prior <= 0 && latest <= 0) {
    return null;
  }

  if (prior <= 0) {
    return { direction: "up", changePercent: 100 };
  }

  const changePercent = ((latest - prior) / prior) * 100;

  return {
    direction:
      changePercent >= 2 ? "up" : changePercent <= -2 ? "down" : "flat",
    changePercent: Math.abs(changePercent),
  };
}

function buildKeyInsights(
  data: AnalyticsData,
  forecasts: ReturnType<typeof buildForecastViewModel>,
  analytics: ReturnType<typeof buildAnalyticsViewModel>,
  aiInsights: ReturnType<typeof buildAiInsightsViewModel>
): VoltAiKeyInsight[] {
  const insights: VoltAiKeyInsight[] = [];

  const marginOpportunity = aiInsights.opportunities.opportunities.find(
    (item) => item.category === "margin_review" || item.category === "markup"
  );
  const profitForecast = forecasts.profit;

  if (
    data.executive.grossMarginPercent > 0 &&
    data.executive.grossMarginPercent < 15
  ) {
    const annualImpact = annualizedImpact(profitForecast.potentialProfitLost);
    insights.push({
      id: "profit-margin-low",
      tone: "warning",
      emoji: "⚠️",
      title: "Low Margins",
      subtitle: annualImpact
        ? "Thin markup is compressing profit on active work"
        : "Review markup on low-margin estimates",
      metricLabel: annualImpact ? "Estimated annual loss" : undefined,
      metricValue: annualImpact ?? undefined,
      actionLabel: "Review Pricing",
      href: marginOpportunity?.href ?? "/estimates",
    });
  } else if (marginOpportunity) {
    const annualImpact = annualizedImpact(profitForecast.potentialProfitLost);
    insights.push({
      id: "profit-margin-review",
      tone: "warning",
      emoji: "⚠️",
      title: "Low Margins",
      subtitle: marginOpportunity.explanation,
      metricLabel: annualImpact ? "Estimated annual loss" : undefined,
      metricValue: annualImpact ?? undefined,
      actionLabel: "Review Pricing",
      href: marginOpportunity.href ?? "/estimates",
    });
  }

  const trend = forecasts.revenueTrend;
  if (trend?.direction === "up") {
    insights.push({
      id: "revenue-increasing",
      tone: "success",
      emoji: "📈",
      title: "Revenue Increasing",
      subtitle: `Momentum is building across accepted work`,
      metricLabel: "Month over month",
      metricValue: `+${Math.abs(trend.changePercent).toFixed(1)}%`,
      actionLabel: "View Analytics",
      href: "/analytics?section=charts",
    });
  } else if (trend?.direction === "down") {
    insights.push({
      id: "revenue-declining",
      tone: "warning",
      emoji: "📉",
      title: "Revenue Declining",
      subtitle: `Accepted revenue is trailing prior periods`,
      metricLabel: "Month over month",
      metricValue: `-${Math.abs(trend.changePercent).toFixed(1)}%`,
      actionLabel: "View Analytics",
      href: "/analytics?section=charts",
    });
  } else {
    const revenueInsight = aiInsights.businessCoach.insights.find(
      (item) => item.category === "revenue_trend"
    );
    if (revenueInsight) {
      const href = revenueInsight.href ?? "/analytics?section=charts";
      insights.push({
        id: "revenue-trend",
        tone: revenueInsight.severity === "success" ? "success" : "info",
        emoji: revenueInsight.severity === "success" ? "📈" : "📊",
        title:
          revenueInsight.severity === "success"
            ? "Revenue Increasing"
            : revenueInsight.title,
        subtitle: revenueInsight.explanation,
        actionLabel: resolveInsightActionLabel("revenue-trend", href),
        href,
      });
    }
  }

  const staleCustomers = data.aiOpportunities.customersWithoutRecentProposal.filter(
    (customer) =>
      customer.daysSinceLastProposal === null ||
      customer.daysSinceLastProposal >= 30
  );
  const followUpCount = Math.max(
    staleCustomers.length,
    analytics.proposalIntelligence.openFollowUpCount
  );

  if (followUpCount > 0) {
    insights.push({
      id: "customer-follow-up",
      tone: "info",
      emoji: "👥",
      title: `${followUpCount} Customer${followUpCount === 1 ? "" : "s"} Need Follow-up`,
      subtitle:
        staleCustomers[0]?.companyName
          ? `Start with ${staleCustomers[0].companyName}`
          : "Proposals or outreach are overdue",
      metricLabel: "Open follow-ups",
      metricValue: String(followUpCount),
      actionLabel: "Open CRM",
      href: staleCustomers[0]?.customerId
        ? `/customers/${staleCustomers[0].customerId}`
        : "/proposals?status=Sent",
    });
  }

  const pipelineItems = [...data.revenueForecast.pipelineItems].sort((left, right) => {
    const leftProbability = getForecastWinProbability(
      left,
      data.revenueForecast.historicalWinRate
    );
    const rightProbability = getForecastWinProbability(
      right,
      data.revenueForecast.historicalWinRate
    );
    return rightProbability * right.value - leftProbability * left.value;
  });
  const topProposal = pipelineItems.find((item) => item.kind === "proposal");

  if (topProposal) {
    const winProbability = getForecastWinProbability(
      topProposal,
      data.revenueForecast.historicalWinRate
    );
    const likelyProposals = pipelineItems.filter(
      (item) =>
        item.kind === "proposal" &&
        getForecastWinProbability(item, data.revenueForecast.historicalWinRate) >= 0.35
    );

    if (winProbability >= 0.35 && topProposal.kind === "proposal") {
      insights.push({
        id: "proposal-likely-close",
        tone: "opportunity",
        emoji: "💰",
        title:
          likelyProposals.length > 1
            ? `${likelyProposals.length} Proposals Likely to Close`
            : "One Proposal Likely to Close",
        subtitle: `"${topProposal.title}" is weighted heavily in the pipeline`,
        metricLabel: "Expected value",
        metricValue: formatCurrency(topProposal.value),
        actionLabel: "View Proposal",
        href: `/proposals/${topProposal.id}`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "getting-started",
      tone: "info",
      emoji: "✨",
      title: "Getting Started",
      subtitle: "Create estimates and send proposals to unlock AI insights",
      actionLabel: "Create Estimate",
      href: "/estimates",
    });
  }

  return insights.slice(0, 4).map((insight) => ({
    ...insight,
    actionLabel:
      insight.actionLabel ??
      resolveInsightActionLabel(insight.id, insight.href),
  }));
}

function opportunityToAction(opportunity: AiOpportunity): VoltAiRecommendedAction {
  const href = opportunity.href ?? "/analytics";
  return {
    id: opportunity.id,
    label: opportunity.recommendedAction,
    href,
    ctaLabel: resolveActionCta(href),
    priority: opportunity.severity === "high" ? "high" : "medium",
  };
}

function buildRecommendedActions(
  data: AnalyticsData,
  analytics: ReturnType<typeof buildAnalyticsViewModel>,
  aiInsights: ReturnType<typeof buildAiInsightsViewModel>,
  dashboardInsights: DashboardInsightsData
): VoltAiRecommendedAction[] {
  const actions: VoltAiRecommendedAction[] = [];

  for (const proposal of analytics.proposalIntelligence.openProposalsAwaitingFollowUp.slice(
    0,
    2
  )) {
    actions.push({
      id: `follow-up-${proposal.id}`,
      label: `Follow up with ${proposal.customerName}`,
      href: proposal.href,
      ctaLabel: resolveActionCta(proposal.href),
      priority: proposal.daysSinceSent >= 7 ? "high" : "medium",
    });
  }

  const markupOpportunity = aiInsights.opportunities.opportunities.find(
    (item) => item.category === "markup" || item.category === "margin_review"
  );
  if (markupOpportunity) {
    const lowMarginEstimate = data.aiOpportunities.lowMarginEstimates[0];
    const href = markupOpportunity.href ?? `/estimates/${lowMarginEstimate?.id ?? ""}`;
    actions.push({
      id: markupOpportunity.id,
      label: lowMarginEstimate
        ? `Increase markup on ${lowMarginEstimate.projectName}`
        : markupOpportunity.title,
      href,
      ctaLabel: resolveActionCta(href),
      priority: markupOpportunity.severity === "high" ? "high" : "medium",
    });
  }

  const awardedProject = data.projects.projectsByStatus.find(
    (stage) => stage.status === "Awarded"
  );
  if (awardedProject && awardedProject.count > 0) {
    actions.push({
      id: "convert-awarded",
      label: "Convert awarded estimate to project",
      href: "/projects?status=Awarded",
      ctaLabel: "Open Project →",
      priority: "high",
    });
  }

  const staleProposals = data.aiOpportunities.staleProposals.filter(
    (proposal) => proposal.daysSinceSent >= 5
  );
  if (
    staleProposals.length > 0 &&
    !actions.some((action) => action.id === "proposal-reminder")
  ) {
    actions.push({
      id: "proposal-reminder",
      label: "Send proposal reminder",
      href: "/proposals?status=Sent",
      ctaLabel: "View Proposals →",
      priority: "medium",
    });
  }

  const leadCount =
    data.charts.projectPipeline.find((stage) => stage.status === "Lead")?.count ?? 0;
  if (leadCount >= 3) {
    actions.push({
      id: "archive-inactive-leads",
      label: "Archive inactive leads",
      href: "/projects?status=Lead",
      ctaLabel: "Open Project →",
      priority: "medium",
    });
  }

  for (const opportunity of aiInsights.opportunities.opportunities) {
    if (actions.some((action) => action.id === opportunity.id)) {
      continue;
    }

    actions.push(opportunityToAction(opportunity));

    if (actions.length >= 8) {
      break;
    }
  }

  for (const item of dashboardInsights.items.slice(0, 3)) {
    if (actions.length >= 8) {
      break;
    }

    if (actions.some((action) => action.label === item.title)) {
      continue;
    }

    actions.push({
      id: item.id,
      label: item.title,
      href: item.href,
      ctaLabel: resolveActionCta(item.href),
      priority: item.severity === "critical" ? "high" : "medium",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "create-estimate",
      label: "Create your first estimate",
      href: "/estimates",
      ctaLabel: "Review Estimate →",
      priority: "high",
    });
  }

  return actions;
}

function buildForecastTiles(
  data: AnalyticsData,
  forecasts: ReturnType<typeof buildForecastViewModel>
): VoltAiForecastTile[] {
  const { revenue, profit } = forecasts;
  const expectedOutflow = Math.max(revenue.expectedRevenue - profit.expectedGrossProfit, 0);
  const pipelineTotal = data.charts.projectPipeline.reduce(
    (sum, stage) => sum + stage.count,
    0
  );
  const activePipelineCount = data.charts.projectPipeline
    .filter((stage) => !["Lost", "Archived"].includes(stage.status))
    .reduce((sum, stage) => sum + stage.count, 0);
  const pipelineHealthScore =
    pipelineTotal > 0 ? clampScore((activePipelineCount / pipelineTotal) * 100) : 0;

  const revenueTrend = forecasts.revenueTrend;
  const profitTrend = compareRevenueTrend(data.charts.profitTrend);
  const pipelineTrend = seriesTrend(
    data.charts.projectPipeline.map((stage) => ({ value: stage.count }))
  );

  const periodLabel = "Next 30 Days";

  return [
    {
      id: "revenue",
      title: "Revenue Forecast",
      value: formatCurrency(revenue.expectedRevenue),
      numericValue: revenue.expectedRevenue,
      changePercent: revenueTrend ? Math.abs(revenueTrend.changePercent) : null,
      changeDirection: revenueTrend?.direction ?? null,
      periodLabel,
      hint: `${revenue.itemCount} pipeline item${revenue.itemCount === 1 ? "" : "s"} · ${formatPercent(revenue.historicalWinRate)} win rate`,
    },
    {
      id: "profit",
      title: "Profit Forecast",
      value: formatCurrency(profit.expectedGrossProfit),
      numericValue: profit.expectedGrossProfit,
      changePercent: profitTrend ? Math.abs(profitTrend.changePercent) : null,
      changeDirection: profitTrend?.direction ?? null,
      periodLabel,
      hint: `${formatPercent(profit.expectedGrossMargin)} expected gross margin`,
    },
    {
      id: "cash-flow",
      title: "Cash Flow Forecast",
      value: formatCurrency(profit.expectedGrossProfit),
      numericValue: profit.expectedGrossProfit,
      changePercent: profitTrend ? Math.abs(profitTrend.changePercent) : null,
      changeDirection: profitTrend?.direction ?? null,
      periodLabel,
      hint: `${formatCurrency(revenue.expectedRevenue)} inflow vs ${formatCurrency(expectedOutflow)} direct cost`,
    },
    {
      id: "pipeline-health",
      title: "Pipeline",
      value: pipelineTotal > 0 ? formatCurrency(data.executive.pipelineValue) : "—",
      numericValue: pipelineTotal > 0 ? data.executive.pipelineValue : null,
      changePercent: pipelineTrend?.changePercent ?? null,
      changeDirection: pipelineTrend?.direction ?? null,
      periodLabel,
      hint:
        pipelineTotal > 0
          ? `${activePipelineCount} active · ${pipelineHealthScore}/100 health`
          : "Add projects to track pipeline health",
    },
  ];
}

function buildPerformanceMetrics(data: AnalyticsData): VoltAiPerformanceMetrics {
  const estimateVolumeTrend = seriesTrend(
    data.charts.estimateVolumeTrend.map((point) => ({ value: point.count }))
  );
  const winRateTrend = seriesTrend(data.charts.winRateTrend);
  const marginTrend = seriesTrend(
    deriveGrossMarginTrend(data.charts.revenueTrend, data.charts.profitTrend)
  );

  return {
    metrics: [
      {
        id: "ai-time-saved",
        label: "AI Time Saved",
        value: `${data.ai.estimatedTimeSavedHours.toFixed(1)} hrs`,
        numericValue: data.ai.estimatedTimeSavedHours,
        suffix: " hrs",
        trend: estimateVolumeTrend?.direction ?? null,
        trendPercent: estimateVolumeTrend?.changePercent ?? null,
      },
      {
        id: "ai-estimates",
        label: "AI Estimates Created",
        value: String(data.ai.aiGeneratedEstimates),
        numericValue: data.ai.aiGeneratedEstimates,
        trend: estimateVolumeTrend?.direction ?? null,
        trendPercent: estimateVolumeTrend?.changePercent ?? null,
      },
      {
        id: "recommendations-accepted",
        label: "Recommendations Accepted",
        value: formatPercent(data.ai.recommendationAcceptanceRate),
        numericValue: data.ai.recommendationAcceptanceRate,
        suffix: "%",
        trend: winRateTrend?.direction ?? null,
        trendPercent: winRateTrend?.changePercent ?? null,
      },
      {
        id: "estimate-accuracy",
        label: "Estimate Accuracy",
        value: formatPercent(data.estimating.estimateAccuracyPercent),
        numericValue: data.estimating.estimateAccuracyPercent,
        suffix: "%",
        trend: marginTrend?.direction ?? null,
        trendPercent: marginTrend?.changePercent ?? null,
      },
    ],
  };
}

export function buildVoltAiAdvisorViewModel(
  data: AnalyticsData,
  dashboardInsights: DashboardInsightsData
): VoltAiAdvisorViewModel {
  const analytics = buildAnalyticsViewModel(data);
  const forecasts = buildForecastViewModel(data);
  const aiInsights = buildAiInsightsViewModel(data);
  const isEmpty =
    data.executive.totalEstimates === 0 &&
    data.executive.totalProposals === 0 &&
    data.executive.activeProjects === 0;

  return {
    businessHealth: buildBusinessHealth(
      data,
      analytics.proposalIntelligence.openFollowUpCount,
      dashboardInsights
    ),
    generatedAt: data.generatedAt,
    aiEnabled: dashboardInsights.aiEnabled,
    summary: dashboardInsights.summary || aiInsights.businessCoach.summary,
    keyInsights: buildKeyInsights(data, forecasts, analytics, aiInsights),
    forecastTiles: buildForecastTiles(data, forecasts),
    recommendedActions: buildRecommendedActions(
      data,
      analytics,
      aiInsights,
      dashboardInsights
    ),
    performance: buildPerformanceMetrics(data),
    suggestedPrompts: [...SUGGESTED_PROMPTS],
    historicalTrends: {
      revenueTrend: data.charts.revenueTrend,
      profitTrend: data.charts.profitTrend,
      winRateTrend: data.charts.winRateTrend,
      estimateVolumeTrend: data.charts.estimateVolumeTrend,
    },
    isEmpty,
  };
}
