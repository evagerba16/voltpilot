import { NextResponse } from "next/server";

import { getProposalByPortalToken } from "@/lib/proposals/portal";
import { generatePortalProposalPdfBuffer } from "@/lib/proposals/generate-pdf";
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
  const rateLimit = checkRateLimit(`portal-pdf:${token}:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const proposal = await getProposalByPortalToken(token);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const result = await generatePortalProposalPdfBuffer(proposal);

  if (!result) {
    return NextResponse.json({ error: "Unable to generate PDF" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
