import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

type AuthCookie = { name: string; value: string; options: CookieOptions };

/**
 * Supabase auth in Route Handlers must attach Set-Cookie to the returned NextResponse.
 * cookies() from next/headers is not reliably applied on redirect responses, and client-side
 * fetches (Next.js <Link>) do not store those cookies unless they are on this response.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  getRedirectUrl: () => URL
) {
  const { url, anonKey } = getSupabaseEnv();
  let authCookies: AuthCookie[] = [];

  const buildRedirectResponse = (redirectUrl: URL) => {
    const nextResponse = NextResponse.redirect(redirectUrl, 303);
    authCookies.forEach(({ name, value, options }) => {
      nextResponse.cookies.set(name, value, options);
    });
    return nextResponse;
  };

  let response = buildRedirectResponse(getRedirectUrl());

  const supabase = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        authCookies = cookiesToSet.map(({ name, value, options }) => ({
          name,
          value,
          options: options ?? {},
        }));
        response = buildRedirectResponse(getRedirectUrl());
      },
    },
  });

  const redirectTo = (redirectUrl: URL) => {
    response = buildRedirectResponse(redirectUrl);
    return response;
  };

  return {
    supabase,
    getResponse: () => response,
    redirectTo,
  };
}
