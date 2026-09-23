import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export function isInviteLoginReturnPath(path: string) {
  return path.startsWith("/invite/");
}

export function extractInviteTokenFromPath(path: string): string | null {
  if (!isInviteLoginReturnPath(path)) {
    return null;
  }

  const token = path.slice("/invite/".length).split("/")[0]?.trim();
  return token || null;
}

export function buildInviteLoginHref(token: string, email: string) {
  return buildInviteSwitchLoginHref(token, email);
}

/** Full document navigation — avoids client server-action redirect bugs on /invite. */
export function buildInviteSwitchAccountHref(token: string, _email?: string) {
  const params = new URLSearchParams();
  params.set("token", token.trim());
  return `/auth/invite-continue?${params.toString()}`;
}

export function buildInviteSwitchLoginHref(token: string, email: string) {
  const trimmedToken = token.trim();
  const trimmedEmail = email.trim();
  return buildLoginPageHref({
    next: trimmedToken ? `/invite/${trimmedToken}` : "/dashboard",
    email: trimmedEmail,
    invite: true,
  });
}

export function buildInviteForgotPasswordHref(token: string, email: string) {
  const loginReturn = buildLoginPageHref({
    next: `/invite/${token.trim()}`,
    email: email.trim(),
    invite: true,
  });
  const params = new URLSearchParams();
  params.set("email", email.trim());
  params.set("next", loginReturn);
  return `/forgot-password?${params.toString()}`;
}

export function buildLoginPageHref(options: {
  next?: string;
  email?: string;
  error?: string;
  message?: string;
  invite?: boolean;
}) {
  const next = safeRedirectPath(options.next);
  const params = new URLSearchParams();
  params.set("next", next);

  const email = options.email?.trim();
  if (email) {
    params.set("email", email);
  }

  if (options.invite || isInviteLoginReturnPath(next)) {
    params.set("invite", "1");
  }

  if (options.error) {
    params.set("error", options.error);
  }

  if (options.message) {
    params.set("message", options.message);
  }

  return `/login?${params.toString()}`;
}
