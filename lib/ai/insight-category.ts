import type { DashboardInsightItem } from "@/lib/ai/types";

export type DashboardInsightCategory =
  | "needs_attention"
  | "opportunity"
  | "informational";

const CATEGORY_LABELS: Record<DashboardInsightCategory, string> = {
  needs_attention: "Needs attention",
  opportunity: "Opportunity",
  informational: "Informational",
};

const CATEGORY_RANK: Record<DashboardInsightCategory, number> = {
  needs_attention: 0,
  opportunity: 1,
  informational: 2,
};

export function insightCategoryLabel(category: DashboardInsightCategory): string {
  return CATEGORY_LABELS[category];
}

export function insightCategoryRank(category: DashboardInsightCategory): number {
  return CATEGORY_RANK[category];
}

export function insightCategoryFromItem(
  item: Pick<DashboardInsightItem, "type" | "severity" | "id">
): DashboardInsightCategory {
  if (item.id.startsWith("ai-action-")) {
    return "informational";
  }

  if (item.type === "recommended_action") {
    return "opportunity";
  }

  if (item.type === "missing_info") {
    return "opportunity";
  }

  if (
    item.type === "review_required" ||
    item.type === "high_risk" ||
    item.type === "low_margin"
  ) {
    return "needs_attention";
  }

  return item.severity === "info" ? "informational" : "needs_attention";
}

export function sortInsightsByCategory<T extends { category: DashboardInsightCategory; severity: DashboardInsightItem["severity"] }>(
  items: T[]
): T[] {
  const severityRank = { critical: 0, warning: 1, info: 2 };

  return [...items].sort((left, right) => {
    const categoryDiff =
      insightCategoryRank(left.category) - insightCategoryRank(right.category);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return severityRank[left.severity] - severityRank[right.severity];
  });
}
