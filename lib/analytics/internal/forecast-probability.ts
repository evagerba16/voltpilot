import type { RevenueForecastPipelineItem } from "@/lib/analytics/types";

const PROPOSAL_WIN_WEIGHTS: Record<string, number> = {
  Viewed: 0.55,
  Sent: 0.35,
  Draft: 0.15,
};

const ESTIMATE_WIN_WEIGHTS: Record<string, number> = {
  Final: 0.4,
  Draft: 0.18,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getForecastWinProbability(
  item: RevenueForecastPipelineItem,
  historicalWinRate: number
) {
  const historical = clamp(historicalWinRate / 100, 0.05, 0.85);

  if (item.kind === "proposal") {
    const base = PROPOSAL_WIN_WEIGHTS[item.status] ?? 0.2;
    if (item.status === "Sent" || item.status === "Viewed") {
      return clamp(base * 0.65 + historical * 0.35, 0.05, 0.9);
    }
    return base;
  }

  const base = ESTIMATE_WIN_WEIGHTS[item.status] ?? 0.15;
  return clamp(base * 0.7 + historical * 0.3, 0.05, 0.75);
}

export function getForecastWorstCaseProbability(
  item: RevenueForecastPipelineItem,
  winProbability: number
) {
  if (item.kind === "proposal" && item.status === "Viewed") {
    return winProbability * 0.5;
  }

  if (item.kind === "estimate" && item.status === "Final") {
    return winProbability * 0.45;
  }

  if (item.kind === "proposal" && item.status === "Sent") {
    return winProbability * 0.35;
  }

  return winProbability * 0.15;
}
