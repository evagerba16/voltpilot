import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import type { DashboardActionItem } from "@/lib/dashboard/briefing";
import { vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type DashboardTodayPrioritiesProps = {
  priorities: DashboardActionItem[];
  hasRisk: boolean;
  isPortfolioEmpty: boolean;
};

export function DashboardTodayPriorities({
  priorities,
  hasRisk,
  isPortfolioEmpty,
}: DashboardTodayPrioritiesProps) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="vp-section-label">Today</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Today&apos;s priorities
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPortfolioEmpty
              ? "Your morning briefing starts here."
              : priorities.length > 0
                ? hasRisk
                  ? "Something needs attention before the rest of your day."
                  : `${priorities.length} item${priorities.length === 1 ? "" : "s"} to handle next`
                : "You're caught up — pick up where you left off below."}
          </p>
        </div>
      </div>

      {priorities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Nothing urgent right now.
        </p>
      ) : (
        <ul className={cn(vpTheme.card, "divide-y divide-border/60")}>
          {priorities.map((item) => (
            <li key={item.id}>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      item.isRisk ? "text-foreground" : "text-foreground"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.context}</p>
                </div>
                <Link
                  href={item.href}
                  className={cn(
                    buttonVariants({ size: "sm", variant: item.isRisk ? "default" : "outline" }),
                    "shrink-0 gap-1.5",
                    item.isRisk ? vpTheme.primaryCta : undefined
                  )}
                >
                  {item.ctaLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
