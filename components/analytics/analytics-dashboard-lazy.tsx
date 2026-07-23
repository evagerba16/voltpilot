"use client";

import dynamic from "next/dynamic";

import { AnalyticsPageSkeleton } from "@/components/analytics/analytics-page-skeleton";
import type { PrecomputedAnalyticsViewModels } from "@/lib/analytics/precompute-view-models";
import type {
  AnalyticsData,
  AnalyticsSection,
  CustomerFilterOption,
  ProjectFilterOption,
} from "@/lib/analytics/types";

const AnalyticsDashboard = dynamic(
  () =>
    import("@/components/analytics/analytics-dashboard").then(
      (module) => module.AnalyticsDashboard
    ),
  {
    loading: () => <AnalyticsPageSkeleton />,
  }
);

type AnalyticsDashboardLazyProps = {
  data: AnalyticsData;
  customers: CustomerFilterOption[];
  projects: ProjectFilterOption[];
  activeSection: AnalyticsSection;
  precomputed: PrecomputedAnalyticsViewModels;
};

export function AnalyticsDashboardLazy(props: AnalyticsDashboardLazyProps) {
  return <AnalyticsDashboard {...props} />;
}
