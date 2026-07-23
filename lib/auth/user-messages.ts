type AuthErrorContext = "sign_in" | "password_reset" | "update_password";

const FRIENDLY_AUTH_MESSAGES = new Set([
  "Enter your email address.",
  "Email or password didn't match. Try again.",
  "We couldn't sign you in. Check your email and password and try again.",
  "We couldn't send a reset email. Check the address and try again in a moment.",
  "Password must be at least 6 characters.",
  "Passwords do not match.",
  "Your reset link expired or is invalid. Request a new one.",
  "We couldn't update your password. Try again in a moment.",
  "Your sign-in link expired or couldn't be verified. Try signing in again.",
  "Create your account by completing subscription checkout.",
]);

function looksTechnical(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("authapierror") ||
    normalized.includes("jwt") ||
    normalized.includes("pgrst") ||
    normalized.includes("supabase") ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("email not confirmed") ||
    normalized.startsWith("auth_")
  );
}

export function friendlyAuthError(
  error: { message?: string } | null | undefined,
  context: AuthErrorContext
): string {
  const message = error?.message?.trim().toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return "Email or password didn't match. Try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the link.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }

  if (context === "update_password" && message.includes("password")) {
    return "We couldn't update your password. Make sure it meets the requirements and try again.";
  }

  if (context === "sign_in") {
    return "We couldn't sign you in. Check your email and password and try again.";
  }

  if (context === "password_reset") {
    return "We couldn't send a reset email. Check the address and try again in a moment.";
  }

  return "We couldn't update your password. Try again in a moment.";
}

export function resolveAuthPageError(
  value: string | undefined,
  context: AuthErrorContext
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === "auth_callback_failed") {
    return "Your sign-in link expired or couldn't be verified. Try signing in again.";
  }

  if (FRIENDLY_AUTH_MESSAGES.has(trimmed)) {
    return trimmed;
  }

  if (looksTechnical(trimmed)) {
    if (context === "sign_in") {
      return "We couldn't sign you in. Check your email and password and try again.";
    }

    if (context === "password_reset") {
      return "We couldn't send a reset email. Check the address and try again in a moment.";
    }

    return "We couldn't update your password. Try again in a moment.";
  }

  return trimmed;
}
