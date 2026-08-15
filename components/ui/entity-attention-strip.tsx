"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type AttentionItem = {
  id: string;
  label: string;
  title: string;
  href: string;
};

type EntityAttentionStripProps = {
  items: AttentionItem[];
  emptyMessage?: string;
};

export function EntityAttentionStrip({ items, emptyMessage }: EntityAttentionStripProps) {
  if (items.length === 0) {
    if (!emptyMessage) {
      return null;
    }

    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-5">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold tracking-tight">Needs attention</h2>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-muted/30"
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="truncate text-sm font-medium">{item.title}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
