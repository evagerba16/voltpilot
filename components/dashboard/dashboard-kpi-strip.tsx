import Link from "next/link";

import { DASHBOARD_KPI_STRIP_IDS } from "@/lib/dashboard/constants";
import type { DashboardKpi } from "@/lib/dashboard/queries";

type DashboardKpiStripProps = {
  kpis: DashboardKpi[];
};

export function DashboardKpiStrip({ kpis }: DashboardKpiStripProps) {
  const stripKpis = DASHBOARD_KPI_STRIP_IDS.map((id) =>
    kpis.find((kpi) => kpi.id === id)
  ).filter((kpi): kpi is DashboardKpi => Boolean(kpi));

  return (
    <section aria-label="Key metrics">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 lg:grid-cols-3">
        {stripKpis.map((kpi) => {
          const content = (
            <>
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.title}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                {kpi.value}
              </p>
            </>
          );

          const className = "bg-card px-4 py-3.5";

          if (kpi.href) {
            return (
              <Link
                key={kpi.id}
                href={kpi.href}
                className={`${className} transition-colors hover:bg-muted/30`}
              >
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
