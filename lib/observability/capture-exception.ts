import { logger } from "@/lib/observability/logger";

type CaptureContext = Record<string, unknown>;

/** Report errors to logs and optional Sentry when SENTRY_DSN is configured. */
export function captureException(error: unknown, context?: CaptureContext) {
  const normalized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error("exception captured", { ...normalized, ...context });

  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

  if (!dsn) {
    return;
  }

  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.captureException(error, { extra: context });
    })
    .catch(() => {
      // Sentry is optional — never break the app if the SDK is unavailable.
    });
}
