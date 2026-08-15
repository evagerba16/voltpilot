"use client";

import { cn } from "@/lib/utils";

type ChartTooltipShellProps = {
  label?: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
};

export function ChartTooltipShell({
  label,
  children,
  active,
  className,
}: ChartTooltipShellProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 text-sm shadow-lg backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150",
        className
      )}
    >
      {label ? <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p> : null}
      {children}
    </div>
  );
}
