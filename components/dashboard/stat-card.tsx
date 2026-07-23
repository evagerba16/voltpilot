import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow motion-safe:duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {change ? (
            <p
              className={
                changeType === "positive"
                  ? "text-xs font-medium text-emerald-600"
                  : changeType === "negative"
                    ? "text-xs font-medium text-red-600"
                    : "text-xs text-muted-foreground"
              }
            >
              {change}
            </p>
          ) : null}
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
