import { NextResponse } from "next/server";

import {
  isCopilotApiFailure,
  parseCopilotDismissRequest,
} from "@/lib/copilot/api";
import { runCopilotDismiss } from "@/lib/copilot/orchestrator";
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
    const context = await assertApiPermission("estimates.edit");

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`copilot-dismiss:${context.userId}:${ip}`, {
      max: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = await request.json();
    const parsed = parseCopilotDismissRequest(body);

    if (isCopilotApiFailure(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await runCopilotDismiss(context.organizationId, parsed);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to dismiss copilot recommendations.",
      },
      { status: apiErrorStatus(error) }
    );
  }
}
