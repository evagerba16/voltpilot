"use client";

import { useCallback, useState } from "react";

import type { EstimateReviewContext } from "@/lib/ai/types";
import type {
  CopilotAnalyzeResult,
  CopilotRecommendation,
} from "@/lib/copilot/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";

type UseEstimateCopilotOptions = {
  estimateId: string;
  state: EstimateBuilderState;
  context: EstimateReviewContext;
};

function patchRecommendationStatus(
  recommendations: CopilotRecommendation[],
  ids: string[],
  status: CopilotRecommendation["status"]
) {
  const idSet = new Set(ids);

  return recommendations.map((rec) =>
    idSet.has(rec.id) ? { ...rec, status } : rec
  );
}

export function useEstimateCopilot({
  estimateId,
  state,
  context,
}: UseEstimateCopilotOptions) {
  const [result, setResult] = useState<CopilotAnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "estimate",
          mode: "review",
          entity_id: estimateId,
          state,
          context,
          previous_recommendation_refs: result?.recommendations
            .filter((rec) => rec.status !== "pending")
            .map((rec) => ({
              id: rec.id,
              title: rec.title,
              category: rec.recommendation_type,
            })),
        }),
      });

      const payload = (await response.json()) as
        | CopilotAnalyzeResult
        | { error?: string };

      if (!response.ok) {
        setError(
          "error" in payload && payload.error ?
            payload.error
          : "Unable to run copilot review."
        );
        return null;
      }

      if ("error" in payload && payload.error) {
        setError(payload.error);
        return null;
      }

      if (!("recommendations" in payload)) {
        setError("Unable to run copilot review.");
        return null;
      }

      setResult(payload);
      return payload;
    } catch (caught) {
      setError(
        caught instanceof Error ?
          caught.message
        : "Unable to run copilot review."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [context, estimateId, result?.recommendations, state]);

  const applyRecommendations = useCallback(
    async (recommendationIds: string[]) => {
      if (recommendationIds.length === 0) {
        return null;
      }

      setActionId(recommendationIds[0] ?? null);
      setError(null);

      try {
        const response = await fetch("/api/copilot/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "estimate",
            entity_type: "estimate",
            entity_id: estimateId,
            recommendation_ids: recommendationIds,
          }),
        });

        const payload = (await response.json()) as {
          applied_ids?: string[];
          skipped_ids?: string[];
          state?: EstimateBuilderState;
          saved_at?: string;
          error?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? "Unable to apply recommendations.");
          return null;
        }

        if ((payload.applied_ids?.length ?? 0) === 0) {
          setError("No changes were applied for this recommendation.");
          return payload;
        }

        setResult((current) =>
          current ?
            {
              ...current,
              recommendations: patchRecommendationStatus(
                current.recommendations,
                payload.applied_ids ?? [],
                "applied"
              ),
            }
          : current
        );

        return payload;
      } catch (caught) {
        setError(
          caught instanceof Error ?
            caught.message
          : "Unable to apply recommendations."
        );
        return null;
      } finally {
        setActionId(null);
      }
    },
    [estimateId]
  );

  const dismissRecommendations = useCallback(
    async (recommendationIds: string[]) => {
      if (recommendationIds.length === 0) {
        return null;
      }

      setActionId(recommendationIds[0] ?? null);
      setError(null);

      try {
        const response = await fetch("/api/copilot/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "estimate",
            entity_type: "estimate",
            entity_id: estimateId,
            recommendation_ids: recommendationIds,
          }),
        });

        const payload = (await response.json()) as {
          dismissed_ids?: string[];
          error?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? "Unable to dismiss recommendations.");
          return null;
        }

        setResult((current) =>
          current ?
            {
              ...current,
              recommendations: patchRecommendationStatus(
                current.recommendations,
                payload.dismissed_ids ?? recommendationIds,
                "dismissed"
              ),
            }
          : current
        );

        return payload;
      } catch (caught) {
        setError(
          caught instanceof Error ?
            caught.message
          : "Unable to dismiss recommendations."
        );
        return null;
      } finally {
        setActionId(null);
      }
    },
    [estimateId]
  );

  return {
    result,
    loading,
    error,
    actionId,
    analyze,
    applyRecommendations,
    dismissRecommendations,
    setError,
  };
}
