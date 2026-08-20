/** VoltPilot product chrome — warm surfaces, amber accent, intelligence surfaces. */
export const VP_INTELLIGENCE_LABEL = "VoltPilot Intelligence";

export const vpTheme = {
  /** Standard content card — neutral, scannable. */
  card: "vp-surface-card rounded-xl",
  /** AI / intelligence container — visually distinct from normal data. */
  intelligenceSurface:
    "vp-intelligence-surface overflow-hidden rounded-xl border border-brand/20 bg-[color-mix(in_oklch,var(--card),var(--brand)_2.5%)]",
  intelligenceBadge:
    "vp-intelligence-badge inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand",
  insightRowAttention: "border-l-2 border-l-brand/60 bg-brand/[0.035]",
  insightRowOpportunity: "border-l-2 border-l-brand/40 bg-brand/[0.02]",
  insightRowInfo: "border-l-2 border-l-border bg-muted/10",
  insightBadgeAttention: "bg-brand/12 text-brand",
  insightBadgeOpportunity: "bg-brand/8 text-brand/90",
  insightBadgeInfo: "bg-muted text-muted-foreground",
  primaryCta: "vp-action-glow rounded-full",
  interactiveRow:
    "transition-colors motion-safe:duration-150 hover:bg-muted/25 focus-visible:bg-muted/25",
} as const;
