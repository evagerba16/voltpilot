import { NextResponse, type NextRequest } from "next/server";

/**
 * @deprecated Session refresh and auth checks run in server layouts (getUser).
 * Edge middleware uses cookie-only gate in /middleware.ts to avoid 504 timeouts.
 */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
