import { cn } from "@/lib/utils";

type ForecastMetricProps = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning" | "muted";
};

const toneStyles = {
  default: "border-border bg-card",
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  muted: "border-border bg-muted/20",
} as const;

export function ForecastMetric({
  label,
  value,
  hint,
  tone = "default",
}: ForecastMetricProps) {
  return (
    <div className={cn("rounded-lg border p-4", toneStyles[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
