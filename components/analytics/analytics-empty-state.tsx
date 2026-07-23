"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type AnalyticsEmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  compact?: boolean;
};

export function AnalyticsEmptyState({
  icon: Icon = BarChart3,
  title,
  description,
  actionLabel,
  actionHref,
  className,
  compact = false,
}: AnalyticsEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-muted/10 px-6 text-center",
        compact ? "py-10" : "h-72 py-8",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="size-7" />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ size: "sm" }), "mt-5")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
