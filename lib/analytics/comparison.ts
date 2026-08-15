import type { AnalyticsData } from "@/lib/analytics/types";

export type MetricComparison = {
  direction: "up" | "down" | "flat";
  changePercent: number;
  current: number;
  prior: number;
  label: string;
};

export type AnalyticsComparisons = {
  executive: {
    revenue: MetricComparison | null;
    totalEstimates: MetricComparison | null;
    winRate: MetricComparison | null;
    grossMarginPercent: MetricComparison | null;
    activeProjects: MetricComparison | null;
    pipelineValue: MetricComparison | null;
  };
  estimating: {
    estimateAccuracyPercent: MetricComparison | null;
    costVariancePercent: MetricComparison | null;
    laborUtilizationPercent: MetricComparison | null;
    changeOrderCount: MetricComparison | null;
  };
  proposals: {
    acceptanceRate: MetricComparison | null;
    averageSalesCycleDays: MetricComparison | null;
    averageProposalValue: MetricComparison | null;
    revenueWon: MetricComparison | null;
    totalSent: MetricComparison | null;
  };
  customers: {
    repeatCustomerRate: MetricComparison | null;
    averageCustomerValue: MetricComparison | null;
    customerLifetimeValue: MetricComparison | null;
  };
  ai: {
    aiGeneratedEstimates: MetricComparison | null;
    aiAdoptionRate: MetricComparison | null;
    estimatedTimeSavedHours: MetricComparison | null;
    recommendationAcceptanceRate: MetricComparison | null;
  };
  projects: {
    totalProjects: MetricComparison | null;
    awardedCount: MetricComparison | null;
    averageMargin: MetricComparison | null;
    totalRevenue: MetricComparison | null;
  };
};

function compareValues(
  current: number,
  prior: number,
  label = "vs prior period"
): MetricComparison | null {
  if (current === 0 && prior === 0) {
    return null;
  }

  if (prior <= 0 && current <= 0) {
    return null;
  }

  if (prior <= 0) {
    return {
      direction: "up",
      changePercent: 100,
      current,
      prior,
      label,
    };
  }

  const changePercent = ((current - prior) / prior) * 100;

  return {
    direction:
      changePercent >= 2 ? "up" : changePercent <= -2 ? "down" : "flat",
    changePercent,
    current,
    prior,
    label,
  };
}

function compareSeriesTotals(
  points: Array<{ value?: number; count?: number }>,
  mode: "value" | "count"
): MetricComparison | null {
  if (points.length < 2) {
    return null;
  }

  const midpoint = Math.floor(points.length / 2);
  const priorSlice = points.slice(0, midpoint);
  const currentSlice = points.slice(midpoint);

  const sum = (slice: typeof points) =>
    slice.reduce(
      (total, point) =>
        total + (mode === "value" ? (point.value ?? 0) : (point.count ?? 0)),
      0
    );

  return compareValues(sum(currentSlice), sum(priorSlice), "vs earlier period");
}

function compareSeriesAverage(
  points: Array<{ value: number }>
): MetricComparison | null {
  if (points.length < 2) {
    return null;
  }

  const midpoint = Math.floor(points.length / 2);
  const priorSlice = points.slice(0, midpoint);
  const currentSlice = points.slice(midpoint);

  const average = (slice: typeof points) => {
    const values = slice.map((point) => point.value).filter((value) => value > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return compareValues(
    average(currentSlice),
    average(priorSlice),
    "vs earlier period"
  );
}

function buildProjectComparisons(
  current: AnalyticsData["projects"],
  prior: AnalyticsData["projects"] | null,
  charts: AnalyticsData["charts"]
): AnalyticsComparisons["projects"] {
  const totalProjects = current.projectsByStatus.reduce(
    (sum, stage) => sum + stage.count,
    0
  );
  const awardedCount =
    current.projectsByStatus.find((stage) => stage.status === "Awarded")?.count ??
    0;
  const margins = current.profitabilityByProject.map(
    (project) => project.marginPercent
  );
  const averageMargin =
    margins.length > 0
      ? margins.reduce((sum, value) => sum + value, 0) / margins.length
      : 0;
  const totalRevenue = current.revenueByProject.reduce(
    (sum, project) => sum + project.revenue,
    0
  );

  if (prior) {
    const priorTotal = prior.projectsByStatus.reduce(
      (sum, stage) => sum + stage.count,
      0
    );
    const priorAwarded =
      prior.projectsByStatus.find((stage) => stage.status === "Awarded")?.count ??
      0;
    const priorMargins = prior.profitabilityByProject.map(
      (project) => project.marginPercent
    );
    const priorAverageMargin =
      priorMargins.length > 0
        ? priorMargins.reduce((sum, value) => sum + value, 0) /
          priorMargins.length
        : 0;
    const priorRevenue = prior.revenueByProject.reduce(
      (sum, project) => sum + project.revenue,
      0
    );

    return {
      totalProjects: compareValues(totalProjects, priorTotal),
      awardedCount: compareValues(awardedCount, priorAwarded),
      averageMargin: compareValues(averageMargin, priorAverageMargin),
      totalRevenue: compareValues(totalRevenue, priorRevenue),
    };
  }

  return {
    totalProjects: compareSeriesTotals(charts.estimateVolumeTrend, "count"),
    awardedCount: null,
    averageMargin: compareSeriesAverage(charts.winRateTrend),
    totalRevenue: compareSeriesTotals(charts.revenueTrend, "value"),
  };
}

export function buildAnalyticsComparisons(
  current: AnalyticsData,
  prior: AnalyticsData | null
): AnalyticsComparisons {
  const label = prior ? "vs prior period" : "vs earlier period";

  const fromPrior = (
    currentValue: number,
    priorValue: number
  ): MetricComparison | null => compareValues(currentValue, priorValue, label);

  return {
    executive: prior
      ? {
          revenue: fromPrior(current.executive.revenue, prior.executive.revenue),
          totalEstimates: fromPrior(
            current.executive.totalEstimates,
            prior.executive.totalEstimates
          ),
          winRate: fromPrior(current.executive.winRate, prior.executive.winRate),
          grossMarginPercent: fromPrior(
            current.executive.grossMarginPercent,
            prior.executive.grossMarginPercent
          ),
          activeProjects: fromPrior(
            current.executive.activeProjects,
            prior.executive.activeProjects
          ),
          pipelineValue: fromPrior(
            current.executive.pipelineValue,
            prior.executive.pipelineValue
          ),
        }
      : {
          revenue: compareSeriesTotals(current.charts.revenueTrend, "value"),
          totalEstimates: compareSeriesTotals(
            current.charts.estimateVolumeTrend,
            "count"
          ),
          winRate: compareSeriesAverage(current.charts.winRateTrend),
          grossMarginPercent: compareSeriesAverage(
            current.charts.profitTrend.map((point, index) => ({
              value:
                current.charts.revenueTrend[index]?.value > 0
                  ? (point.value / current.charts.revenueTrend[index].value) *
                    100
                  : 0,
            }))
          ),
          activeProjects: null,
          pipelineValue: null,
        },
    estimating: prior
      ? {
          estimateAccuracyPercent: fromPrior(
            current.estimating.estimateAccuracyPercent,
            prior.estimating.estimateAccuracyPercent
          ),
          costVariancePercent: fromPrior(
            current.estimating.costVariancePercent,
            prior.estimating.costVariancePercent
          ),
          laborUtilizationPercent: fromPrior(
            current.estimating.laborUtilizationPercent,
            prior.estimating.laborUtilizationPercent
          ),
          changeOrderCount: fromPrior(
            current.estimating.changeOrderCount,
            prior.estimating.changeOrderCount
          ),
        }
      : {
          estimateAccuracyPercent: null,
          costVariancePercent: null,
          laborUtilizationPercent: null,
          changeOrderCount: null,
        },
    proposals: prior
      ? {
          acceptanceRate: fromPrior(
            current.proposals.acceptanceRate,
            prior.proposals.acceptanceRate
          ),
          averageSalesCycleDays: fromPrior(
            current.proposals.averageSalesCycleDays,
            prior.proposals.averageSalesCycleDays
          ),
          averageProposalValue: fromPrior(
            current.proposals.averageProposalValue,
            prior.proposals.averageProposalValue
          ),
          revenueWon: fromPrior(
            current.proposals.revenueWon,
            prior.proposals.revenueWon
          ),
          totalSent: fromPrior(
            current.proposals.totalSent,
            prior.proposals.totalSent
          ),
        }
      : {
          acceptanceRate: compareSeriesAverage(current.charts.winRateTrend),
          averageSalesCycleDays: null,
          averageProposalValue: compareSeriesTotals(
            current.charts.proposalVolumeTrend,
            "value"
          ),
          revenueWon: compareSeriesTotals(current.charts.revenueTrend, "value"),
          totalSent: compareSeriesTotals(
            current.charts.proposalVolumeTrend,
            "count"
          ),
        },
    customers: prior
      ? {
          repeatCustomerRate: fromPrior(
            current.customers.repeatCustomerRate,
            prior.customers.repeatCustomerRate
          ),
          averageCustomerValue: fromPrior(
            current.customers.averageCustomerValue,
            prior.customers.averageCustomerValue
          ),
          customerLifetimeValue: fromPrior(
            current.customers.customerLifetimeValue,
            prior.customers.customerLifetimeValue
          ),
        }
      : {
          repeatCustomerRate: null,
          averageCustomerValue: compareSeriesTotals(
            current.charts.revenueTrend,
            "value"
          ),
          customerLifetimeValue: compareSeriesTotals(
            current.charts.customerGrowthTrend,
            "count"
          ),
        },
    ai: prior
      ? {
          aiGeneratedEstimates: fromPrior(
            current.ai.aiGeneratedEstimates,
            prior.ai.aiGeneratedEstimates
          ),
          aiAdoptionRate: fromPrior(
            current.ai.aiAdoptionRate,
            prior.ai.aiAdoptionRate
          ),
          estimatedTimeSavedHours: fromPrior(
            current.ai.estimatedTimeSavedHours,
            prior.ai.estimatedTimeSavedHours
          ),
          recommendationAcceptanceRate: fromPrior(
            current.ai.recommendationAcceptanceRate,
            prior.ai.recommendationAcceptanceRate
          ),
        }
      : {
          aiGeneratedEstimates: compareSeriesTotals(
            current.charts.estimateVolumeTrend,
            "count"
          ),
          aiAdoptionRate: null,
          estimatedTimeSavedHours: null,
          recommendationAcceptanceRate: null,
        },
    projects: buildProjectComparisons(
      current.projects,
      prior?.projects ?? null,
      current.charts
    ),
  };
}
