/** Compact KPI strip on the dashboard home page. */
export const DASHBOARD_KPI_STRIP_IDS = [
  "monthly-revenue",
  "active-projects",
  "pending-proposals",
] as const;

/** Dashboard layout is frozen for closed beta. Change only when:
 *  - A production bug is discovered
 *  - Multiple beta users report the same usability issue
 *  - A critical workflow problem is identified
 * Do not redesign based on preference. */
export const DASHBOARD_FROZEN = true;

export const DASHBOARD_MAX_AI_INSIGHTS = 3;
