import { NextResponse } from "next/server";

import {
  executeEstimateReview,
  isEstimateReviewFailure,
  parseEstimateReviewRequest,
} from "@/lib/ai/estimate-review-api";
import { assertApiPermission } from "@/lib/auth/get-team-context";
import { apiErrorStatus } from "@/lib/auth/permission-errors";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await assertApiPermission("ai.view");

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`ai-review:${context.userId}:${ip}`, {
      max: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = await request.json();
    const parsed = parseEstimateReviewRequest(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const response = await executeEstimateReview(
      context.organizationId,
      parsed.estimateId,
      parsed.payload
    );

    if (isEstimateReviewFailure(response)) {
      return NextResponse.json({ error: response.error }, { status: response.status });
    }

    return NextResponse.json(response.result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ?
            error.message
          : "Unable to process estimate review request.",
      },
      { status: apiErrorStatus(error) }
    );
  }
}
