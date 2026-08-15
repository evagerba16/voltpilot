"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import type { VoltAiRecommendedAction } from "@/lib/ai/business-advisor";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

type VoltAiActionRowProps = {
  action: VoltAiRecommendedAction;
  priority: "high" | "medium";
};

export function VoltAiActionRow({ action, priority }: VoltAiActionRowProps) {
  return (
    <li>
      <Link
        href={action.href}
        className={cn(
          "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all motion-safe:duration-200",
          "hover:-translate-y-0.5 hover:shadow-sm",
          voltAiAccent.border,
          voltAiAccent.borderHover,
          priority === "high" ? "bg-red-500/5" : "bg-card"
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <CheckCircle2
            className={cn(
              "mt-0.5 size-4 shrink-0",
              priority === "high" ? "text-emerald-600" : "text-muted-foreground"
            )}
          />
          <span className="text-sm font-medium leading-snug">{action.label}</span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors",
            voltAiAccent.text,
            "group-hover:gap-1.5"
          )}
        >
          {action.ctaLabel}
          <ArrowRight className="size-3.5" />
        </span>
      </Link>
    </li>
  );
}
