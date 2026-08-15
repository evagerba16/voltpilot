export const CUSTOMER_DETAIL_TABS = [
  "overview",
  "activity",
  "notes-docs",
  "projects",
] as const;

export type CustomerDetailTabId = (typeof CUSTOMER_DETAIL_TABS)[number];

export const PROJECT_DETAIL_TABS = [
  "overview",
  "estimate",
  "job-costing",
  "details",
] as const;

export type ProjectDetailTabId = (typeof PROJECT_DETAIL_TABS)[number];

export function parseEntityTab<T extends string>(
  value: string | undefined,
  validTabs: readonly T[],
  fallback: T
): T {
  if (value && validTabs.includes(value as T)) {
    return value as T;
  }

  return fallback;
}
