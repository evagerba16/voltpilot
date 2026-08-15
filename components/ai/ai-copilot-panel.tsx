"use client";

import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";

import type { CopilotSuggestion } from "@/lib/ai/proactive-copilot";
import { cn } from "@/lib/utils";

type AiCopilotPanelProps = {
  suggestions: CopilotSuggestion[];
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

export function AiCopilotPanel({
  suggestions,
  title = "AI Copilot",
  description = "Proactive suggestions to help you win more work and protect margin.",
  compact = false,
  className,
}: AiCopilotPanelProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {compact ? <Sparkles className="size-4" /> : <Bot className="size-4" />}
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {!compact ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className={cn("divide-y divide-border", compact ? "px-4 py-2" : "px-5 py-2")}>
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className={cn(
              "flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between",
              compact && "py-2.5"
            )}
          >
            <p className="text-sm leading-relaxed">
              <span className="mr-2 text-violet-600 dark:text-violet-400" aria-hidden>
                →
              </span>
              {suggestion.message}
            </p>
            <Link
              href={suggestion.href}
              className={cn(
                "shrink-0 text-sm font-medium text-primary hover:underline",
                suggestion.priority === "high" && "text-violet-700 dark:text-violet-300"
              )}
            >
              {suggestion.ctaLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
