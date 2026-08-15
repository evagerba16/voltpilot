import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type DashboardKpiCardProps = {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  highlight?: boolean;
  href?: string;
};

export function DashboardKpiCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  highlight = false,
  href,
}: DashboardKpiCardProps) {
  const content = (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all motion-safe:duration-200 hover:shadow-md",
        highlight
          ? "border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card"
          : "border-border bg-card hover:border-primary/20"
      )}
    >
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
          {change ? (
            <p
              className={cn(
                "text-xs font-medium",
                changeType === "positive"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : changeType === "negative"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
              )}
            >
              {change}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>

      {href ? (
        <div className="relative mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View details
          <ArrowUpRight className="size-3.5" />
        </div>
      ) : null}
    </article>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
