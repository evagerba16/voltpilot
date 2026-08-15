// Optional — only loaded when NEXT_PUBLIC_SENTRY_DSN is set.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
