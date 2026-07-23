import {
  DollarSign,
  FileText,
  FolderKanban,
  Percent,
  PencilLine,
} from "lucide-react";

import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { getProjectStats } from "@/lib/projects/queries";

export async function getDashboardStats() {
  const stats = await getProjectStats();

  return [
    {
      title: "Active Projects",
      value: String(stats.activeProjects),
      change: `${stats.estimatingProjects} in estimating`,
      changeType: "neutral" as const,
      icon: FolderKanban,
    },
    {
      title: "Draft Estimates",
      value: String(stats.draftEstimates),
      change: "Across your portfolio",
      changeType: "neutral" as const,
      icon: PencilLine,
    },
    {
      title: "Proposals Sent",
      value: String(stats.proposalsSent),
      change: `${stats.awardedProjects} awarded`,
      changeType: stats.proposalsSent > 0 ? ("positive" as const) : ("neutral" as const),
      icon: FileText,
    },
    {
      title: "Estimated Revenue",
      value: formatCurrency(stats.estimatedRevenue),
      change: "Active pipeline value",
      changeType: "positive" as const,
      icon: DollarSign,
    },
    {
      title: "Average Project Margin",
      value: formatPercent(stats.averageMargin),
      change: "From saved estimates",
      changeType: stats.averageMargin >= 10 ? ("positive" as const) : ("neutral" as const),
      icon: Percent,
    },
  ];
}
