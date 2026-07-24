import { NextResponse } from "next/server";

import {
  isCopilotApiFailure,
  parseCopilotApplyRequest,
} from "@/lib/copilot/api";
import { runCopilotApply } from "@/lib/copilot/orchestrator";
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
    const rateLimit = checkRateLimit(`copilot-apply:${context.userId}:${ip}`, {
      max: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const body = await request.json();
    const parsed = parseCopilotApplyRequest(body);

    if (isCopilotApiFailure(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await runCopilotApply(context.organizationId, parsed);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to apply copilot recommendations.",
      },
      { status: apiErrorStatus(error) }
    );
  }
}
