import Link from "next/link";
import { ArrowRight, Info, Lightbulb, TriangleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  insightCategoryLabel,
  sortInsightsByCategory,
  type DashboardInsightCategory,
} from "@/lib/ai/insight-category";
import type { DashboardInsightsData } from "@/lib/ai/types";
import { DASHBOARD_MAX_AI_INSIGHTS } from "@/lib/dashboard/constants";
import { cn } from "@/lib/utils";

type DashboardAiInsightsCompactProps = {
  data: DashboardInsightsData;
};

const categoryStyles: Record<
  DashboardInsightCategory,
  { row: string; badge: string; icon: typeof Info }
> = {
  needs_attention: {
    row: "border-l-amber-500/40 bg-amber-500/[0.03]",
    badge: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    icon: TriangleAlert,
  },
  opportunity: {
    row: "border-l-violet-500/40 bg-violet-500/[0.03]",
    badge: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
    icon: Lightbulb,
  },
  informational: {
    row: "border-l-border bg-muted/10",
    badge: "bg-muted text-muted-foreground",
    icon: Info,
  },
};

export function DashboardAiInsightsCompact({ data }: DashboardAiInsightsCompactProps) {
  const items = sortInsightsByCategory(data.items).slice(0, DASHBOARD_MAX_AI_INSIGHTS);
  const remainingCount = Math.max(0, data.items.length - items.length);

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No recommendations right now. Create estimates to unlock bid intelligence.
            </p>
            <Link href="/estimates" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              Create your first estimate
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => {
              const styles = categoryStyles[item.category];
              const CategoryIcon = styles.icon;

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block border-l-2 px-6 py-4 transition-colors hover:bg-muted/20",
                      styles.row
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <CategoryIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                            styles.badge
                          )}
                        >
                          {insightCategoryLabel(item.category)}
                        </span>
                        <p className="mt-1.5 text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                          {item.nextAction}
                          <ArrowRight className="size-3.5" />
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {remainingCount > 0 ? (
          <div className="border-t border-border px-6 py-3">
            <Link
              href="/ai"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open command center
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
