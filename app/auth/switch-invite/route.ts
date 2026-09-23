import { type NextRequest, NextResponse } from "next/server";

/** Legacy links → document GET on invite-continue. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const target = new URL("/auth/invite-continue", request.url);
  if (token) {
    target.searchParams.set("token", token);
  }
  return NextResponse.redirect(target, 307);
}
