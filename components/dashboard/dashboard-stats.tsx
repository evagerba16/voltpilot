import type { LucideIcon } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";

type DashboardStatsProps = {
  stats: Array<{
    title: string;
    value: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: LucideIcon;
  }>;
  isPortfolioEmpty: boolean;
};

export function DashboardStats({ stats, isPortfolioEmpty }: DashboardStatsProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      {isPortfolioEmpty ? (
        <p className="text-sm text-muted-foreground">
          These metrics populate automatically as you create estimates and
          proposals.
        </p>
      ) : null}
    </div>
  );
}
