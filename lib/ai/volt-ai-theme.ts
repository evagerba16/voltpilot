/** Scoped Tailwind classes for the Volt AI page accent (violet/indigo). */
export const voltAiAccent = {
  gradient:
    "bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-900",
  gradientSoft:
    "bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent",
  border: "border-violet-500/20",
  borderHover: "hover:border-violet-500/35",
  text: "text-violet-600 dark:text-violet-400",
  textMuted: "text-violet-600/80 dark:text-violet-400/80",
  icon: "text-violet-500",
  button:
    "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500",
  buttonOutline:
    "border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300",
  chip:
    "border-violet-500/25 bg-violet-500/5 text-violet-800 hover:bg-violet-500/15 dark:text-violet-200",
  ring: "ring-violet-500/30",
  glow: "shadow-[0_0_24px_-4px_rgba(139,92,246,0.35)]",
  progress: "bg-violet-500",
  progressTrack: "bg-violet-500/15",
  pulse: "motion-safe:animate-[volt-ai-pulse_2.5s_ease-in-out_infinite]",
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
