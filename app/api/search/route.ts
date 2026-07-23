import { NextResponse } from "next/server";

import { getTeamContext } from "@/lib/auth/get-team-context";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/security/url-validation";
import { globalSearch } from "@/lib/search/queries";

export async function GET(request: Request) {
  const context = await getTeamContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`search:${context.userId}:${ip}`, {
    max: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, MAX_SEARCH_QUERY_LENGTH);

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await globalSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Search failed.",
      },
      { status: 500 }
    );
  }
}
