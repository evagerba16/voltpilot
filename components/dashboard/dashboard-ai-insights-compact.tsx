import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  insightCategoryLabel,
  sortInsightsByCategory,
  type DashboardInsightCategory,
} from "@/lib/ai/insight-category";
import type { DashboardInsightsData } from "@/lib/ai/types";
import { DASHBOARD_MAX_AI_INSIGHTS } from "@/lib/dashboard/constants";
import { IntelligenceSectionHeader } from "@/components/ui/intelligence-section-header";
import { vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type DashboardAiInsightsCompactProps = {
  data: DashboardInsightsData;
};

const categoryStyles: Record<
  DashboardInsightCategory,
  { row: string; badge: string }
> = {
  needs_attention: {
    row: vpTheme.insightRowAttention,
    badge: vpTheme.insightBadgeAttention,
  },
  opportunity: {
    row: vpTheme.insightRowOpportunity,
    badge: vpTheme.insightBadgeOpportunity,
  },
  informational: {
    row: vpTheme.insightRowInfo,
    badge: vpTheme.insightBadgeInfo,
  },
};

export function DashboardAiInsightsCompact({ data }: DashboardAiInsightsCompactProps) {
  const items = sortInsightsByCategory(data.items).slice(0, DASHBOARD_MAX_AI_INSIGHTS);
  const remainingCount = Math.max(0, data.items.length - items.length);

  return (
    <section className="space-y-4">
      <IntelligenceSectionHeader
        title="Actionable insights"
        description="Recommendations based on your pipeline — each one links to the next step."
      />

      <div className={vpTheme.intelligenceSurface}>
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Insights appear as your portfolio grows. Create estimates to unlock bid intelligence.
            </p>
            <Link href="/estimates" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              Create your first estimate
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => {
              const styles = categoryStyles[item.category];

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "vp-interactive-row block px-6 py-4",
                      styles.row
                    )}
                  >
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                          styles.badge
                        )}
                      >
                        {insightCategoryLabel(item.category)}
                      </span>
                      <p className="mt-1.5 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                        {item.nextAction}
                        <ArrowRight className="size-3.5" />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {remainingCount > 0 ? (
          <div className="border-t border-border/60 px-6 py-3">
            <Link
              href="/ai"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              View all insights
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
