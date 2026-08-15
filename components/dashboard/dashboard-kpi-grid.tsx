import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { DASHBOARD_KPI_STRIP_IDS } from "@/lib/dashboard/constants";
import type { DashboardKpi } from "@/lib/dashboard/queries";

type DashboardKpiGridProps = {
  kpis: DashboardKpi[];
  isPortfolioEmpty: boolean;
};

/** @deprecated Prefer DashboardKpiStrip on the home dashboard. */
export function DashboardKpiGrid({ kpis, isPortfolioEmpty }: DashboardKpiGridProps) {
  const primaryKpis = DASHBOARD_KPI_STRIP_IDS.map((id) =>
    kpis.find((kpi) => kpi.id === id)
  ).filter((kpi): kpi is DashboardKpi => Boolean(kpi));

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight">Key metrics</h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {primaryKpis.map((kpi) => (
          <DashboardKpiCard key={kpi.id} {...kpi} highlight={false} />
        ))}
      </div>

      {isPortfolioEmpty ? (
        <p className="text-sm text-muted-foreground">
          KPIs populate automatically as you add customers, projects, estimates, and proposals.
        </p>
      ) : null}
    </section>
  );
}
