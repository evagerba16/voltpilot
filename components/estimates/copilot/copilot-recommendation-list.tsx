import { CopilotRecommendationCard } from "@/components/estimates/copilot/copilot-recommendation-card";
import type { CopilotRecommendation } from "@/lib/copilot/types";

type CopilotRecommendationListProps = {
  recommendations: CopilotRecommendation[];
  disabled?: boolean;
  actionId?: string | null;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function CopilotRecommendationList({
  recommendations,
  disabled = false,
  actionId = null,
  onApply,
  onDismiss,
}: CopilotRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No recommendations yet. Run a review to see suggestions for this estimate.
      </div>
    );
  }

  const pending = recommendations.filter((rec) => rec.status === "pending");
  const resolved = recommendations.filter((rec) => rec.status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending ({pending.length})
          </h3>
          {pending.map((recommendation) => (
            <CopilotRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              disabled={disabled}
              busy={actionId === recommendation.id}
              onApply={onApply}
              onDismiss={onDismiss}
            />
          ))}
        </section>
      ) : null}

      {resolved.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resolved ({resolved.length})
          </h3>
          {resolved.map((recommendation) => (
            <CopilotRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              disabled
              onApply={onApply}
              onDismiss={onDismiss}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
