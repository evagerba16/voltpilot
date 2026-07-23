import { NextResponse } from "next/server";

import { assertPermission } from "@/lib/auth/get-team-context";
import { generateProposalPdfBuffer } from "@/lib/proposals/generate-pdf";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const teamContext = await assertPermission("proposals.view");

  const { id } = await context.params;
  const result = await generateProposalPdfBuffer(id, teamContext.organizationId);

  if (!result) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
