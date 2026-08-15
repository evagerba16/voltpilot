"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { CopilotRunReviewButton } from "@/components/estimates/copilot/copilot-button";
import { CopilotHealthBanner } from "@/components/estimates/copilot/copilot-health-banner";
import { CopilotPanelHeader } from "@/components/estimates/copilot/copilot-panel-header";
import { CopilotRecommendationList } from "@/components/estimates/copilot/copilot-recommendation-list";
import type { EstimateReviewContext } from "@/lib/ai/types";
import { getMetaSourceLabel } from "@/lib/copilot/client/format-copilot-display";
import { useEstimateCopilot } from "@/lib/copilot/client/use-estimate-copilot";
import type { EstimateBuilderState } from "@/lib/estimates/types";

type EstimateCopilotPanelProps = {
  open: boolean;
  onClose: () => void;
  estimateId: string;
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  disabled?: boolean;
  onApplied: (nextState: EstimateBuilderState, savedAt?: string) => void;
};

export function EstimateCopilotPanel({
  open,
  onClose,
  estimateId,
  state,
  context,
  disabled = false,
  onApplied,
}: EstimateCopilotPanelProps) {
  const {
    result,
    loading,
    error,
    actionId,
    analyze,
    applyRecommendations,
    dismissRecommendations,
  } = useEstimateCopilot({ estimateId, state, context });

  const analyzeOnOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      analyzeOnOpenRef.current = false;
      return;
    }

    if (analyzeOnOpenRef.current || result || loading) {
      return;
    }

    analyzeOnOpenRef.current = true;
    void analyze();
  }, [open, result, loading, analyze]);

  async function handleApply(recommendationId: string) {
    const payload = await applyRecommendations([recommendationId]);

    if (payload?.state) {
      onApplied(payload.state, payload.saved_at);
    }
  }

  async function handleDismiss(recommendationId: string) {
    await dismissRecommendations([recommendationId]);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close copilot panel"
      />

      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <CopilotPanelHeader onClose={onClose} />

        <div className="border-b border-border px-5 py-4">
          <CopilotRunReviewButton onClick={() => void analyze()} loading={loading} />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading && !result ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Copilot is reviewing materials, labor, pricing, and scope...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {result?.health ? (
            <CopilotHealthBanner
              health={result.health}
              summary={result.meta.summary}
            />
          ) : null}

          {result ? (
            <p className="text-xs text-muted-foreground">
              {getMetaSourceLabel(result.meta.source)}
              {result.meta.ai_enabled ? " · OpenAI enabled" : " · Rules engine"}
            </p>
          ) : null}

          {result ? (
            <CopilotRecommendationList
              recommendations={result.recommendations}
              disabled={disabled || loading}
              actionId={actionId}
              onApply={(id) => void handleApply(id)}
              onDismiss={(id) => void handleDismiss(id)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
