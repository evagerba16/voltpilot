import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware must stay tiny and synchronous — no Supabase, fetch, or heavy imports.
 * Auth validation runs in server layouts via getUser().
 */

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasAuthCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers },
  });
}

/**
 * Only authenticated app routes — bypassed entirely:
 * /, /login, /api/*, /p/*, /privacy, /terms, static assets, webhooks.
 */
export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/ai",
    "/ai/:path*",
    "/customers",
    "/customers/:path*",
    "/projects",
    "/projects/:path*",
    "/estimates",
    "/estimates/:path*",
    "/proposals",
    "/proposals/:path*",
    "/analytics",
    "/analytics/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
