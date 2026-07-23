import type { AnalyticsDateRange, AnalyticsFilters } from "@/lib/analytics/types";

type AnalyticsUrlParams = {
  range?: AnalyticsDateRange;
  customer?: string;
  project?: string;
  status?: string;
  section?: string;
};

export function buildAnalyticsUrl({
  range,
  customer,
  project,
  status,
  section,
}: AnalyticsUrlParams) {
  const params = new URLSearchParams();

  if (range && range !== "12m") {
    params.set("range", range);
  }

  if (customer) {
    params.set("customer", customer);
  }

  if (project) {
    params.set("project", project);
  }

  if (status) {
    params.set("status", status);
  }

  if (section && section !== "executive") {
    params.set("section", section);
  }

  const query = params.toString();
  return query ? `/analytics?${query}` : "/analytics";
}

export function parseAnalyticsFilters(searchParams: {
  range?: string;
  customer?: string;
  project?: string;
  status?: string;
  section?: string;
}): AnalyticsFilters & { section: string } {
  const validRanges = ["7d", "30d", "90d", "12m", "ytd", "all"] as const;
  const dateRange = validRanges.includes(searchParams.range as AnalyticsDateRange)
    ? (searchParams.range as AnalyticsDateRange)
    : "12m";

  const validSections = [
    "executive",
    "estimating",
    "proposals",
    "customers",
    "projects",
    "ai",
    "charts",
  ] as const;

  const section = validSections.includes(
    searchParams.section as (typeof validSections)[number]
  )
    ? (searchParams.section as string)
    : "executive";

  return {
    dateRange,
    customerId: searchParams.customer?.trim() ?? "",
    projectId: searchParams.project?.trim() ?? "",
    projectStatus: searchParams.status?.trim() ?? "",
    section,
  };
}

export function buildAnalyticsExportUrl(
  format: "csv" | "pdf",
  filters: AnalyticsFilters
) {
  const params = new URLSearchParams();

  if (filters.dateRange !== "12m") {
    params.set("range", filters.dateRange);
  }

  if (filters.customerId) {
    params.set("customer", filters.customerId);
  }

  if (filters.projectId) {
    params.set("project", filters.projectId);
  }

  if (filters.projectStatus) {
    params.set("status", filters.projectStatus);
  }

  const query = params.toString();
  return query
    ? `/api/analytics/export/${format}?${query}`
    : `/api/analytics/export/${format}`;
}
