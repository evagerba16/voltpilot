import type { OrganizationSeatUsage } from "@/lib/billing/entitlements";

export function formatSeatUsage(usage: OrganizationSeatUsage) {
  if (usage.seatLimit === null) {
    return `${usage.activeMembers} active member${usage.activeMembers === 1 ? "" : "s"}`;
  }

  return `${usage.seatsUsed} of ${usage.seatLimit} seats used`;
}
