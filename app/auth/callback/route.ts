import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler-client";
import { clearPendingInviteTokenOnResponse } from "@/lib/teams/pending-invite-cookie-response";

const RESET_PASSWORD_PATH = "/reset-password";

function resolvePostAuthRedirect(request: NextRequest, nextPath: string) {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return new URL(nextPath, origin);
  }

  if (forwardedHost) {
    return new URL(nextPath, `https://${forwardedHost}`);
  }

  return new URL(nextPath, origin);
}

function isPasswordRecoveryNext(next: string | null | undefined) {
  if (!next) {
    return false;
  }

  const trimmed = next.trim();
  return trimmed === RESET_PASSWORD_PATH || trimmed.startsWith(`${RESET_PASSWORD_PATH}?`);
}

function isPasswordRecoveryFlow(searchParams: URLSearchParams) {
  if (searchParams.get("type") === "recovery") {
    return true;
  }

  return isPasswordRecoveryNext(searchParams.get("next"));
}

function resolveCallbackNextPath(searchParams: URLSearchParams) {
  if (isPasswordRecoveryFlow(searchParams)) {
    return RESET_PASSWORD_PATH;
  }

  return safeRedirectPath(searchParams.get("next"));
}

function loginLinkExpiredRedirect(origin: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Your sign-in link expired or couldn't be verified. Try signing in again.")}`
  );
}

function resetLinkInvalidRedirect(origin: string) {
  return NextResponse.redirect(
    `${origin}/reset-password?error=${encodeURIComponent("Your reset link expired or is invalid. Request a new one.")}`
  );
}

/** Preserve implicit-flow tokens in the hash (server redirects cannot carry #fragment). */
function recoveryHashHandoffResponse() {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Redirecting…</title></head><body><script>window.location.replace("/reset-password"+window.location.hash)</script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const passwordRecovery = isPasswordRecoveryFlow(searchParams);
  const next = resolveCallbackNextPath(searchParams);

  const hasCodeExchange = Boolean(code);
  const hasOtpVerify = Boolean(tokenHash && otpType);

  if (!hasCodeExchange && !hasOtpVerify) {
    if (passwordRecovery) {
      return recoveryHashHandoffResponse();
    }

    return loginLinkExpiredRedirect(origin);
  }

  const redirectUrl = resolvePostAuthRedirect(request, next);

  const { supabase, redirectTo } = createSupabaseRouteHandlerClient(
    request,
    () => redirectUrl
  );

  const authError = hasOtpVerify
    ? (
        await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: otpType as EmailOtpType,
        })
      ).error
    : (await supabase.auth.exchangeCodeForSession(code!)).error;

  if (authError) {
    return passwordRecovery
      ? resetLinkInvalidRedirect(origin)
      : loginLinkExpiredRedirect(origin);
  }

  const response = redirectTo(redirectUrl);

  if (passwordRecovery) {
    clearPendingInviteTokenOnResponse(response);
  }

  return response;
}
