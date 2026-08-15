import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DashboardContinueItem } from "@/lib/dashboard/briefing";

type DashboardContinueWorkingProps = {
  items: DashboardContinueItem[];
};

export function DashboardContinueWorking({ items }: DashboardContinueWorkingProps) {
  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground">Continue working</h2>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span className="truncate text-sm text-foreground">{item.label}</span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
