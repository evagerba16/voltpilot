import {
  getForecastWinProbability,
  getForecastWorstCaseProbability,
} from "@/lib/analytics/internal/forecast-probability";
import { safePercent } from "@/lib/analytics/time-buckets";
import type { AnalyticsData, RevenueForecastInput } from "@/lib/analytics/types";

export type ForecastSource = "rules" | "openai";

export type RevenueTrendComparison = {
  direction: "up" | "down" | "flat";
  changePercent: number;
  latest: number;
  prior: number;
};

export type RevenueForecastResult = {
  currentPipeline: number;
  expectedRevenue: number;
  bestCaseRevenue: number;
  worstCaseRevenue: number;
  generatedAt: string;
  source: ForecastSource;
  methodology: string;
  itemCount: number;
  historicalWinRate: number;
};

export type ProfitForecastResult = {
  expectedGrossProfit: number;
  expectedGrossMargin: number;
  potentialProfitLost: number;
  lowMarginItemCount: number;
  targetMarginPercent: number;
  generatedAt: string;
  source: ForecastSource;
  methodology: string;
};

export type ForecastViewModel = {
  revenue: RevenueForecastResult;
  profit: ProfitForecastResult;
  revenueTrend: RevenueTrendComparison | null;
};

export function compareRevenueTrend(
  points: AnalyticsData["charts"]["revenueTrend"]
): RevenueTrendComparison | null {
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
    return { direction: "up", changePercent: 100, latest, prior };
  }

  const changePercent = ((latest - prior) / prior) * 100;

  return {
    direction:
      changePercent >= 2 ? "up" : changePercent <= -2 ? "down" : "flat",
    changePercent,
    latest,
    prior,
  };
}

export function generateRevenueForecast(
  input: RevenueForecastInput,
  generatedAt: string,
  source: ForecastSource = "rules"
): RevenueForecastResult {
  let currentPipeline = 0;
  let expectedRevenue = 0;
  let worstCaseRevenue = 0;

  for (const item of input.pipelineItems) {
    const winProbability = getForecastWinProbability(
      item,
      input.historicalWinRate
    );

    currentPipeline += item.value;
    expectedRevenue += item.value * winProbability;
    worstCaseRevenue +=
      item.value * getForecastWorstCaseProbability(item, winProbability);
  }

  return {
    currentPipeline,
    expectedRevenue,
    bestCaseRevenue: currentPipeline,
    worstCaseRevenue,
    generatedAt,
    source,
    methodology:
      "Weighted by proposal status (Draft, Sent, Viewed) and estimate stage, blended with historical win rate.",
    itemCount: input.pipelineItems.length,
    historicalWinRate: input.historicalWinRate,
  };
}

export function generateProfitForecast(
  input: RevenueForecastInput,
  generatedAt: string,
  source: ForecastSource = "rules"
): ProfitForecastResult {
  let expectedGrossProfit = 0;
  let expectedRevenue = 0;
  let potentialProfitLost = 0;
  let lowMarginItemCount = 0;

  for (const item of input.pipelineItems) {
    const winProbability = getForecastWinProbability(
      item,
      input.historicalWinRate
    );
    const expectedItemRevenue = item.value * winProbability;
    const itemProfit =
      item.profitAmount > 0
        ? item.profitAmount
        : item.value * (item.marginPercent / 100);

    expectedRevenue += expectedItemRevenue;
    expectedGrossProfit += itemProfit * winProbability;

    if (
      item.kind === "estimate" &&
      item.marginPercent > 0 &&
      item.marginPercent < input.targetMarginPercent
    ) {
      lowMarginItemCount += 1;
      const marginGap = input.targetMarginPercent - item.marginPercent;
      potentialProfitLost += expectedItemRevenue * (marginGap / 100);
    }
  }

  return {
    expectedGrossProfit,
    expectedGrossMargin: safePercent(expectedGrossProfit, expectedRevenue),
    potentialProfitLost,
    lowMarginItemCount,
    targetMarginPercent: input.targetMarginPercent,
    generatedAt,
    source,
    methodology:
      "Expected profit applies pipeline margins weighted by proposal status and estimate stage. Profit lost compares low-margin items to the target margin.",
  };
}

export function buildForecastViewModel(
  data: AnalyticsData,
  source: ForecastSource = "rules"
): ForecastViewModel {
  return {
    revenue: generateRevenueForecast(data.revenueForecast, data.generatedAt, source),
    profit: generateProfitForecast(data.revenueForecast, data.generatedAt, source),
    revenueTrend: compareRevenueTrend(data.charts.revenueTrend),
  };
}

export async function generateRevenueForecastAsync(
  input: RevenueForecastInput,
  generatedAt: string
): Promise<RevenueForecastResult> {
  return generateRevenueForecast(input, generatedAt, "openai");
}

export async function generateProfitForecastAsync(
  input: RevenueForecastInput,
  generatedAt: string
): Promise<ProfitForecastResult> {
  return generateProfitForecast(input, generatedAt, "openai");
}

export async function buildForecastViewModelAsync(
  data: AnalyticsData
): Promise<ForecastViewModel> {
  return buildForecastViewModel(data, "openai");
}
