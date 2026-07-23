"use server";

import { assertPermission } from "@/lib/auth/get-team-context";
import { MAX_AI_USER_MESSAGE_LENGTH } from "@/lib/security/url-validation";
import {
  appendEstimateAiMessage,
  getEstimateAiSession,
  getOrCreateEstimateAiSession,
} from "@/lib/estimates/ai-queries";
import type {
  AiEstimateAssistantRecommendation,
  AiEstimateAssistantSession,
} from "@/lib/ai/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { verifyEstimateOwnership } from "@/lib/estimates/queries";
import { saveAiEstimateVersion } from "@/app/(dashboard)/estimates/actions";

export async function loadEstimateAiSession(
  estimateId: string
): Promise<{ session: AiEstimateAssistantSession | null; error?: string }> {
  try {
    const context = await assertPermission("estimates.view");
    const ownsEstimate = await verifyEstimateOwnership(
      estimateId,
      context.organizationId
    );

    if (!ownsEstimate) {
      return { session: null, error: "Estimate was not found." };
    }

    const session = await getEstimateAiSession(estimateId);
    return { session };
  } catch (error) {
    return {
      session: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load AI estimating session.",
    };
  }
}

export async function saveEstimateAiUserMessage(
  estimateId: string,
  content: string
) {
  try {
    const context = await assertPermission("estimates.edit");
    const ownsEstimate = await verifyEstimateOwnership(
      estimateId,
      context.organizationId
    );

    if (!ownsEstimate) {
      return { error: "Estimate was not found." };
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { error: "Message is required." };
    }

    if (trimmedContent.length > MAX_AI_USER_MESSAGE_LENGTH) {
      return { error: "Message is too long." };
    }

    const sessionId = await getOrCreateEstimateAiSession(
      estimateId,
      context.userId,
      context.organizationId
    );

    const message = await appendEstimateAiMessage(sessionId, "user", trimmedContent);
    return { message, sessionId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save AI message.",
    };
  }
}

export async function saveEstimateAiAssistantMessage(
  estimateId: string,
  content: string,
  recommendations: AiEstimateAssistantRecommendation
) {
  try {
    const context = await assertPermission("estimates.edit");
    const ownsEstimate = await verifyEstimateOwnership(
      estimateId,
      context.organizationId
    );

    if (!ownsEstimate) {
      return { error: "Estimate was not found." };
    }

    const sessionId = await getOrCreateEstimateAiSession(
      estimateId,
      context.userId,
      context.organizationId
    );

    const message = await appendEstimateAiMessage(
      sessionId,
      "assistant",
      content,
      recommendations
    );

    return { message, sessionId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save AI response.",
    };
  }
}

export async function applyAiEstimateRecommendations(
  estimateId: string,
  payload: EstimateBuilderState
) {
  try {
    await assertPermission("estimates.edit");
    return saveAiEstimateVersion(estimateId, payload);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to apply AI recommendations.",
    };
  }
}
