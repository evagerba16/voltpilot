import Link from "next/link";

import { DASHBOARD_KPI_STRIP_IDS } from "@/lib/dashboard/constants";
import type { DashboardKpi } from "@/lib/dashboard/queries";
import { vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type DashboardKpiStripProps = {
  kpis: DashboardKpi[];
};

export function DashboardKpiStrip({ kpis }: DashboardKpiStripProps) {
  const stripKpis = DASHBOARD_KPI_STRIP_IDS.map((id) =>
    kpis.find((kpi) => kpi.id === id)
  ).filter((kpi): kpi is DashboardKpi => Boolean(kpi));

  return (
    <section aria-label="Key metrics">
      <p className="vp-section-label mb-3">Key metrics</p>
      <div className={cn(vpTheme.card, "divide-y divide-border/60")}>
        {stripKpis.map((kpi) => {
          const content = (
            <>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {kpi.title}
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums text-foreground">
                {kpi.value}
              </p>
              {kpi.change ? (
                <p className="mt-1 text-xs text-muted-foreground">{kpi.change}</p>
              ) : null}
            </>
          );

          const className =
            "px-5 py-4 transition-colors motion-safe:duration-150 hover:bg-muted/25";

          if (kpi.href) {
            return (
              <Link key={kpi.id} href={kpi.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <div key={kpi.id} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
