export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

export const CHART_COLORS = {
  revenue: "#3b82f6",
  profit: "#10b981",
  winRate: "#f59e0b",
  estimates: "#6366f1",
  proposals: "#8b5cf6",
  customers: "#14b8a6",
  equipment: "#a855f7",
  material: "#f97316",
  margin: "#22c55e",
  mrr: "#7c3aed",
} as const;

export const CHART_GRID = {
  strokeDasharray: "3 3",
  className: "stroke-border/50",
  vertical: false,
};

export const CHART_AXIS = {
  tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
  tickLine: false,
  axisLine: false,
};

export const CHART_MARGINS = {
  default: { top: 8, right: 12, left: 0, bottom: 0 },
  verticalBar: { top: 8, right: 12, left: 4, bottom: 0 },
};

export function chartGradientId(key: string) {
  return `analytics-${key}-gradient`;
}
