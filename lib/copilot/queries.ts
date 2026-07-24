import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CopilotRecommendation,
  CopilotRecommendationStatus,
} from "@/lib/copilot/types";

type CopilotRecommendationRow = {
  id: string;
  organization_id: string;
  user_id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  recommendation_type: string;
  severity: string;
  title: string;
  explanation: string;
  payload: Record<string, unknown>;
  reasoning: Record<string, unknown>;
  status: CopilotRecommendationStatus;
  created_at: string;
  applied_at: string | null;
  dismissed_at: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toPersistedId(recommendation: CopilotRecommendation) {
  return isUuid(recommendation.id) ? recommendation.id : crypto.randomUUID();
}

function mapRow(row: CopilotRecommendationRow): CopilotRecommendation {
  return {
    id: row.id,
    module: row.module as CopilotRecommendation["module"],
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    recommendation_type:
      row.recommendation_type as CopilotRecommendation["recommendation_type"],
    severity: row.severity as CopilotRecommendation["severity"],
    title: row.title,
    explanation: row.explanation,
    payload: row.payload as CopilotRecommendation["payload"],
    reasoning: row.reasoning as CopilotRecommendation["reasoning"],
    status: row.status,
    created_at: row.created_at,
    applied_at: row.applied_at,
    dismissed_at: row.dismissed_at,
  };
}

function isMissingTableError(message: string) {
  return message.includes("copilot_recommendations");
}

export async function replaceCopilotRecommendations(
  organizationId: string,
  userId: string,
  entityType: string,
  entityId: string,
  recommendations: CopilotRecommendation[]
) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("copilot_recommendations")
    .delete()
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "pending");

  if (deleteError && !isMissingTableError(deleteError.message)) {
    throw new Error(deleteError.message);
  }

  if (recommendations.length === 0) {
    return recommendations;
  }

  const rows = recommendations.map((rec) => {
    const id = toPersistedId(rec);
    return {
      id,
      organization_id: organizationId,
      user_id: userId,
      module: rec.module,
      entity_type: rec.entity_type,
      entity_id: rec.entity_id,
      recommendation_type: rec.recommendation_type,
      severity: rec.severity,
      title: rec.title,
      explanation: rec.explanation,
      payload: rec.payload,
      reasoning: {
        ...rec.reasoning,
        source_recommendation_id: rec.id,
      },
      status: rec.status,
    };
  });

  const { data, error } = await supabase
    .from("copilot_recommendations")
    .insert(rows)
    .select("*");

  if (error) {
    if (isMissingTableError(error.message)) {
      return recommendations;
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as CopilotRecommendationRow));
}

export async function getCopilotRecommendationsByIds(
  organizationId: string,
  entityType: string,
  entityId: string,
  recommendationIds: string[]
) {
  if (recommendationIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("id", recommendationIds);

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as CopilotRecommendationRow));
}

export async function listPendingCopilotRecommendations(
  organizationId: string,
  entityType: string,
  entityId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as CopilotRecommendationRow));
}

export async function updateCopilotRecommendationStatuses(
  organizationId: string,
  recommendationIds: string[],
  status: Exclude<CopilotRecommendationStatus, "pending">,
  scope?: { entity_type: string; entity_id: string }
) {
  if (recommendationIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const timestamp = new Date().toISOString();
  const patch =
    status === "applied"
      ? { status, applied_at: timestamp, dismissed_at: null }
      : { status, dismissed_at: timestamp, applied_at: null };

  let query = supabase
    .from("copilot_recommendations")
    .update(patch)
    .eq("organization_id", organizationId)
    .in("id", recommendationIds)
    .eq("status", "pending");

  if (scope) {
    query = query
      .eq("entity_type", scope.entity_type)
      .eq("entity_id", scope.entity_id);
  }

  const { data, error } = await query.select("id");

  if (error) {
    if (isMissingTableError(error.message)) {
      return recommendationIds;
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.id));
}
