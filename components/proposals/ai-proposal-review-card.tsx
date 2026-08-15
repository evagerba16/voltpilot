"use client";

import { Sparkles } from "lucide-react";

import {
  formatProposalStarRating,
  reviewProposal,
  type ProposalReviewResult,
} from "@/lib/ai/proposal-review";
import type { ProposalEditorState } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type AiProposalReviewCardProps = {
  state: ProposalEditorState;
  onFocusField?: (field: keyof ProposalEditorState) => void;
};

function scoreStyles(score: number) {
  if (score >= 90) {
    return "text-emerald-700 dark:text-emerald-400";
  }

  if (score >= 75) {
    return "text-amber-700 dark:text-amber-400";
  }

  return "text-destructive";
}

function suggestionPrefix(kind: ProposalReviewResult["suggestions"][number]["kind"]) {
  switch (kind) {
    case "warning":
      return "⚠️";
    case "success":
      return "✓";
    default:
      return "•";
  }
}

export function AiProposalReviewCard({
  state,
  onFocusField,
}: AiProposalReviewCardProps) {
  const result = reviewProposal(state);

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Proposal Review</h2>
            <p className="text-sm text-muted-foreground">
              Pre-send readiness check before this goes to the customer
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proposal score
          </p>
          <p className={cn("text-2xl font-bold tabular-nums", scoreStyles(result.score))}>
            {result.score}/100
          </p>
          <p className="text-sm" aria-label={`${result.starRating} out of 5 stars`}>
            {formatProposalStarRating(result.starRating)}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground">{result.summary}</p>

        {result.suggestions.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggestions
            </p>
            <ul className="space-y-2">
              {result.suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  {suggestion.field && onFocusField ? (
                    <button
                      type="button"
                      onClick={() => onFocusField(suggestion.field!)}
                      className="text-left text-sm text-foreground transition-colors hover:text-primary"
                    >
                      <span className="mr-2" aria-hidden>
                        {suggestionPrefix(suggestion.kind)}
                      </span>
                      {suggestion.message}
                    </button>
                  ) : (
                    <p className="text-sm text-foreground">
                      <span className="mr-2" aria-hidden>
                        {suggestionPrefix(suggestion.kind)}
                      </span>
                      {suggestion.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            <span className="mr-2" aria-hidden>
              ✓
            </span>
            All key proposal sections are in place.
          </p>
        )}
      </div>
    </section>
  );
}

export function buildProposalReviewSummary(state: ProposalEditorState) {
  return reviewProposal(state);
}
