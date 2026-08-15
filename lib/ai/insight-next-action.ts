import type { DashboardInsightItem } from "@/lib/ai/types";

const DEFAULT_NEXT_ACTIONS: Record<DashboardInsightItem["type"], string> = {
  review_required: "Review estimate now",
  low_margin: "Adjust markup before sending",
  missing_info: "Add assumptions and notes",
  high_risk: "Request senior review",
  recommended_action: "Generate proposal",
};

export function defaultInsightNextAction(type: DashboardInsightItem["type"]): string {
  return DEFAULT_NEXT_ACTIONS[type];
}
