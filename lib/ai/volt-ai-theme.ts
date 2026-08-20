/** Scoped accent classes for VoltPilot Intelligence surfaces (brand amber). */
export const voltAiAccent = {
  gradient: "bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950",
  gradientSoft: "bg-[color-mix(in_oklch,var(--card),var(--brand)_3%)]",
  border: "border-brand/20",
  borderHover: "hover:border-brand/30",
  text: "text-brand",
  textMuted: "text-brand/80",
  icon: "text-brand",
  button: "rounded-full bg-brand text-brand-foreground vp-action-glow hover:bg-brand/92",
  buttonOutline: "rounded-full border-brand/30 text-brand hover:bg-brand/10",
  chip: "border-brand/25 bg-brand/8 text-brand hover:bg-brand/12",
  ring: "ring-brand/30",
  progress: "bg-brand",
  progressTrack: "bg-brand/15",
} as const;

export function healthStatusEmoji(score: number) {
  if (score >= 90) return "🟢";
  if (score >= 75) return "🟡";
  if (score >= 60) return "🟠";
  return "🔴";
}

export function resolveActionCta(href: string) {
  if (href.includes("/customers")) return "Open CRM →";
  if (href.includes("/proposals")) return "View Proposals →";
  if (href.includes("/estimates")) return "Review Estimate →";
  if (href.includes("/projects")) return "Open Project →";
  if (href.includes("/analytics")) return "View Analytics →";
  return "Take Action →";
}

export function resolveInsightActionLabel(
  insightId: string,
  href?: string
): string {
  if (insightId.includes("margin") || insightId.includes("profit-margin")) {
    return "Review Pricing";
  }
  if (insightId.includes("follow-up") || insightId.includes("customer")) {
    return "Open CRM";
  }
  if (insightId.includes("proposal")) {
    return "View Proposal";
  }
  if (insightId.includes("revenue")) {
    return "View Analytics";
  }
  if (insightId === "getting-started") {
    return "Create Estimate";
  }
  if (href?.includes("/estimates")) return "Review Estimate";
  if (href?.includes("/proposals")) return "View Proposals";
  if (href?.includes("/customers")) return "Open CRM";
  return "Take Action";
}
