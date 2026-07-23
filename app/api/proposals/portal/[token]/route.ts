import { NextResponse } from "next/server";

import { getProposalByPortalToken } from "@/lib/proposals/portal";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`portal:${token}:${ip}`, {
    max: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const proposal = await getProposalByPortalToken(token).catch(() => null);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}
