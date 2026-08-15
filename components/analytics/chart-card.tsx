import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  children,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm transition-all motion-safe:duration-300 hover:border-primary/15 hover:shadow-md sm:p-6",
        className
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform motion-safe:duration-300 group-hover:scale-105">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
