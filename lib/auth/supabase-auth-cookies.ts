import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }
}
