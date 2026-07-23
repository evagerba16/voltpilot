import { NextResponse } from "next/server";

import {
  generateEstimateRecommendations,
  streamEstimateExplanation,
} from "@/lib/ai/estimate-assistant";
import type { AiEstimateAssistantPayload } from "@/lib/ai/types";
import { assertApiPermission } from "@/lib/auth/get-team-context";
import { apiErrorStatus } from "@/lib/auth/permission-errors";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { MAX_AI_USER_MESSAGE_LENGTH } from "@/lib/security/url-validation";
import {
  appendEstimateAiMessage,
  getOrCreateEstimateAiSession,
} from "@/lib/estimates/ai-queries";
import { verifyEstimateOwnership } from "@/lib/estimates/queries";
import type { EstimateBuilderState } from "@/lib/estimates/types";

export const runtime = "nodejs";

type RequestBody = {
  estimateId: string;
  userMessage: string;
  state: EstimateBuilderState;
  context: AiEstimateAssistantPayload["context"];
  history: AiEstimateAssistantPayload["history"];
};

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const context = await assertApiPermission("ai.view");

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`ai-assistant:${context.userId}:${ip}`, {
      max: 15,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = (await request.json()) as RequestBody;

    if (!body.estimateId || !body.userMessage?.trim() || !body.state) {
      return NextResponse.json(
        { error: "estimateId, userMessage, and state are required." },
        { status: 400 }
      );
    }

    const userMessage = body.userMessage.trim();
    if (userMessage.length > MAX_AI_USER_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 }
      );
    }

    const ownsEstimate = await verifyEstimateOwnership(
      body.estimateId,
      context.organizationId
    );

    if (!ownsEstimate) {
      return NextResponse.json({ error: "Estimate was not found." }, { status: 404 });
    }

    const payload: AiEstimateAssistantPayload = {
      estimateId: body.estimateId,
      userMessage,
      state: body.state,
      context: body.context,
      history: body.history ?? [],
    };

    const sessionId = await getOrCreateEstimateAiSession(
      body.estimateId,
      context.userId,
      context.organizationId
    );

    await appendEstimateAiMessage(sessionId, "user", payload.userMessage);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(encodeSse(event, data)));
        };

        try {
          send("status", { message: "Analyzing project scope..." });

          const explanation = await streamEstimateExplanation(payload, (delta) => {
            send("explanation_delta", { text: delta });
          });

          send("status", { message: "Building structured recommendations..." });

          const recommendations = await generateEstimateRecommendations(
            payload,
            explanation
          );

          const result = {
            ...recommendations,
            explanation: recommendations.explanation || explanation,
          };

          const savedMessage = await appendEstimateAiMessage(
            sessionId,
            "assistant",
            result.explanation,
            result
          );

          send("recommendations", {
            recommendations: result,
            messageId: savedMessage.id,
          });
          send("done", { success: true });
        } catch (error) {
          send("error", {
            message:
              error instanceof Error
                ? error.message
                : "Unable to generate AI estimate recommendations.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process AI estimating request.",
      },
      { status: apiErrorStatus(error) }
    );
  }
}
