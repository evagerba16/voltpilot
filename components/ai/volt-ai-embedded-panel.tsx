"use client";

import { useState, useTransition } from "react";
import { Bot, X } from "lucide-react";

import { askVoltAi } from "@/app/(dashboard)/ai/actions";
import type { VoltAiContextParams } from "@/lib/ai/context";
import { embeddedPromptsForContext } from "@/lib/ai/embedded-prompts";
import { voltAiAccent } from "@/lib/ai/volt-ai-theme";
import { cn } from "@/lib/utils";

type VoltAiEmbeddedPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  context: VoltAiContextParams;
  suggestedPrompts?: string[];
};

export function VoltAiEmbeddedPanel({
  open,
  onClose,
  title,
  description,
  context,
  suggestedPrompts,
}: VoltAiEmbeddedPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const prompts = suggestedPrompts ?? embeddedPromptsForContext(context);

  function submitQuestion(prompt?: string) {
    const value = (prompt ?? question).trim();
    if (!value) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await askVoltAi(value, context);
      if (response.error) {
        setError(response.error);
        setAnswer(null);
        return;
      }

      setAnswer(response.answer ?? null);
      if (prompt) {
        setQuestion(prompt);
      }
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Close Volt AI panel"
        onClick={onClose}
      />

      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl",
          "motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="volt-ai-embedded-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Bot className="size-5" />
            </div>
            <div>
              <h2 id="volt-ai-embedded-title" className="text-base font-semibold">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion();
            }}
          >
            <label htmlFor="volt-ai-embedded-input" className="sr-only">
              Ask Volt AI
            </label>
            <textarea
              id="volt-ai-embedded-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about this work…"
              rows={3}
              className={cn(
                "w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all",
                "focus-visible:border-violet-500/50 focus-visible:ring-3 focus-visible:ring-violet-500/20"
              )}
            />
            <button
              type="submit"
              disabled={isPending || !question.trim()}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-white transition-opacity disabled:opacity-50",
                voltAiAccent.button
              )}
            >
              {isPending ? "Thinking…" : "Ask Volt AI"}
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isPending}
                onClick={() => submitQuestion(prompt)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-all",
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
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Volt AI
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed">{answer}</p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
