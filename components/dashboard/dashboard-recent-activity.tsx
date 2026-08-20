"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/ui/relative-time";
import type { DashboardActivityItem } from "@/lib/dashboard/queries";
import { vpTheme } from "@/lib/ui/vp-theme";

type DashboardRecentActivityProps = {
  items: DashboardActivityItem[];
};

export function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="vp-section-label">Activity</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        Recent activity
      </h2>
      <ul className={`${vpTheme.card} mt-4 divide-y divide-border/60`}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-baseline justify-between gap-4 px-5 py-3.5 text-sm transition-colors motion-safe:duration-150 hover:bg-muted/25"
            >
              <p className="min-w-0 truncate text-muted-foreground">
                <span>{item.action}</span>
                <span className="text-foreground/85"> · {item.title}</span>
              </p>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground/80">
                <RelativeTime value={item.timestamp} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
