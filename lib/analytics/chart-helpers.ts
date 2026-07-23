import type { AnalyticsData } from "@/lib/analytics/types";

export type TrendPoint = {
  label: string;
  value: number;
};

export type VolumePoint = {
  label: string;
  count: number;
};

export function deriveGrossMarginTrend(
  revenueTrend: TrendPoint[],
  profitTrend: TrendPoint[]
): TrendPoint[] {
  return revenueTrend.map((revenue, index) => {
    const profit = profitTrend[index]?.value ?? 0;
    const margin =
      revenue.value > 0 ? (profit / revenue.value) * 100 : 0;

    return {
      label: revenue.label,
      value: margin,
    };
  });
}

export function hasValueSeries(points: TrendPoint[]) {
  return points.some((point) => point.value > 0);
}

export function hasCountSeries(points: VolumePoint[]) {
  return points.some((point) => point.count > 0);
}

export function isAnalyticsPortfolioEmpty(data: Pick<AnalyticsData, "executive">) {
  return (
    data.executive.totalEstimates === 0 &&
    data.executive.totalProposals === 0 &&
    data.executive.revenue === 0 &&
    data.executive.activeProjects === 0
  );
}
