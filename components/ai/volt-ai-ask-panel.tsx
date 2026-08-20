"use client";

import { Bot, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

type VoltAiAskPanelProps = {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (prompt?: string) => void;
  suggestedPrompts: string[];
  answer: string | null;
  error: string | null;
  isPending: boolean;
};

export function VoltAiAskPanel({
  question,
  onQuestionChange,
  onSubmit,
  suggestedPrompts,
  answer,
  error,
  isPending,
}: VoltAiAskPanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
        voltAiAccent.border
      )}
    >
      <div className={cn("border-b px-6 py-5", voltAiAccent.gradientSoft, voltAiAccent.border)}>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            className={cn("inline-flex", isPending && "motion-safe:animate-pulse")}
            aria-hidden="true"
          >
            🤖
          </span>
          Ask Volt AI
          <Sparkles className={cn("size-4", voltAiAccent.icon)} />
        </h2>
      </div>

      <div className="space-y-5 p-6">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="relative flex-1">
            <label htmlFor="volt-ai-ask-input" className="sr-only">
              Ask anything about your business
            </label>
            <input
              id="volt-ai-ask-input"
              type="text"
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="Ask anything about your business..."
              className={cn(
                "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition-all",
                "focus-visible:border-violet-500/50 focus-visible:ring-3 focus-visible:ring-violet-500/20"
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={isPending || !question.trim()}
            className={cn("h-11 shrink-0 gap-2 px-5", voltAiAccent.button)}
          >
            <Send className="size-4" />
            {isPending ? "Thinking…" : "Send"}
          </Button>
        </form>

        {isPending ? (
          <p className="text-sm text-muted-foreground">
            Analyzing your business
            <span className="motion-safe:animate-[volt-ai-cursor_1s_step-end_infinite]">
              |
            </span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isPending}
              onClick={() => onSubmit(prompt)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all motion-safe:duration-200",
                "hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50",
                voltAiAccent.chip
              )}
            >
              {prompt}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {answer ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
              "border-violet-500/20 bg-violet-500/5"
            )}
          >
            <div
              className={cn(
                "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
                voltAiAccent.text
              )}
            >
              <Bot className="size-3.5" />
              Volt AI
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {answer}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
