import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AiEstimateAssistantMessage,
  AiEstimateAssistantRecommendation,
  AiEstimateAssistantSession,
} from "@/lib/ai/types";

export async function getOrCreateEstimateAiSession(
  estimateId: string,
  userId: string,
  organizationId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("estimate_ai_sessions")
    .select("id")
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("estimate_ai_sessions")
    .insert({
      estimate_id: estimateId,
      user_id: userId,
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("estimate_ai_sessions")) {
      throw new Error(
        "AI session tables are not available. Apply migration 011_ai_estimate_assistant.sql."
      );
    }

    throw new Error(error.message);
  }

  return data.id;
}

export async function getEstimateAiSession(
  estimateId: string
): Promise<AiEstimateAssistantSession | null> {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("estimate_ai_sessions")
    .select("id, estimate_id")
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (sessionError) {
    if (sessionError.message.includes("estimate_ai_sessions")) {
      return null;
    }

    throw new Error(sessionError.message);
  }

  if (!session) {
    return null;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("estimate_ai_messages")
    .select("id, role, content, recommendations, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    if (messagesError.message.includes("estimate_ai_messages")) {
      return { id: session.id, estimate_id: session.estimate_id, messages: [] };
    }

    throw new Error(messagesError.message);
  }

  return {
    id: session.id,
    estimate_id: session.estimate_id,
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      recommendations:
        (message.recommendations as AiEstimateAssistantRecommendation | null) ??
        null,
      created_at: message.created_at,
    })),
  };
}

export async function appendEstimateAiMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  recommendations?: AiEstimateAssistantRecommendation | null
): Promise<AiEstimateAssistantMessage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimate_ai_messages")
    .insert({
      session_id: sessionId,
      role,
      content,
      recommendations: recommendations ?? null,
    })
    .select("id, role, content, recommendations, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("estimate_ai_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return {
    id: data.id,
    role: data.role as "user" | "assistant",
    content: data.content,
    recommendations:
      (data.recommendations as AiEstimateAssistantRecommendation | null) ?? null,
    created_at: data.created_at,
  };
}
