"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/ui/relative-time";
import type { DashboardActivityItem } from "@/lib/dashboard/queries";

type DashboardRecentActivityProps = {
  items: DashboardActivityItem[];
};

export function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
      <ul className="mt-3 space-y-0 divide-y divide-border/50">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-baseline justify-between gap-4 py-2.5 text-sm transition-colors hover:text-foreground"
            >
              <p className="min-w-0 truncate text-muted-foreground">
                <span>{item.action}</span>
                <span className="text-foreground/80"> · {item.title}</span>
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
