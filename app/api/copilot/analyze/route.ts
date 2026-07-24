import { NextResponse } from "next/server";

import {
  isCopilotApiFailure,
  parseCopilotAnalyzeRequest,
} from "@/lib/copilot/api";
import { runCopilotAnalysis } from "@/lib/copilot/orchestrator";
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
    const rateLimit = checkRateLimit(`copilot-analyze:${context.userId}:${ip}`, {
      max: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = await request.json();
    const parsed = parseCopilotAnalyzeRequest(body);

    if (isCopilotApiFailure(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await runCopilotAnalysis(
      context.organizationId,
      context.userId,
      parsed
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run copilot analysis.",
      },
      { status: apiErrorStatus(error) }
    );
  }
}
