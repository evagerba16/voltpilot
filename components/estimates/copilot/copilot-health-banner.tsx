import type { CopilotHealthSummary } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  ready: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    label: "Ready to send",
  },
  review_required: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    label: "Review recommended",
  },
  not_ready: {
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    label: "Not ready",
  },
} as const;

type CopilotHealthBannerProps = {
  health: CopilotHealthSummary;
  summary?: string;
};

export function CopilotHealthBanner({ health, summary }: CopilotHealthBannerProps) {
  const styles = STATUS_STYLES[health.status];

  return (
    <div className={cn("rounded-lg border px-4 py-3", styles.border, "bg-muted/20")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", styles.badge)}>
          {styles.label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{health.score}/100</span>
      </div>
      <p className="mt-2 text-sm font-medium">{health.headline}</p>
      {summary ? (
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
      ) : null}
      {health.highlights.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {health.highlights.slice(0, 4).map((highlight) => (
            <li key={highlight}>• {highlight}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
