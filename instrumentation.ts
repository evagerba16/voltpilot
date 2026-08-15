import { validateRequiredEnv } from "@/lib/env/validate";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

    if (dsn) {
      await import("./sentry.server.config");
    }
  }

  // Warn on missing recommended production vars; strict only when explicitly enabled.
  const strictProduction =
    process.env.VOLTPILOT_STRICT_ENV === "1" && process.env.NODE_ENV === "production";

  validateRequiredEnv({ strict: strictProduction });
}
