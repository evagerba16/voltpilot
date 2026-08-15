import { cn } from "@/lib/utils";

type ProjectProgressBarProps = {
  value: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
};

export function ProjectProgressBar({
  value,
  size = "md",
  showLabel = true,
  className,
}: ProjectProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Progress</span>
          <span className="tabular-nums font-semibold">{clamped.toFixed(0)}%</span>
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 motion-safe:animate-in motion-safe:slide-in-from-left",
            clamped >= 80
              ? "bg-emerald-500"
              : clamped >= 45
                ? "bg-primary"
                : "bg-amber-500"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
