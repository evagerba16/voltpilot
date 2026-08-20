import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DashboardContinueItem } from "@/lib/dashboard/briefing";
import { vpTheme } from "@/lib/ui/vp-theme";

type DashboardContinueWorkingProps = {
  items: DashboardContinueItem[];
};

export function DashboardContinueWorking({ items }: DashboardContinueWorkingProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="vp-section-label">Resume</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        Continue working
      </h2>
      <ul className={`${vpTheme.card} mt-4 divide-y divide-border/60`}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors motion-safe:duration-150 hover:bg-muted/25"
            >
              <span className="truncate text-sm text-foreground">{item.label}</span>
              <ArrowRight className="size-3.5 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
