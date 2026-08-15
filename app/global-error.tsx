"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    if (dsn) {
      void import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => undefined);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#111827",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ maxWidth: "28rem", color: "#6b7280", lineHeight: 1.5 }}>
            VoltPilot hit an unexpected error. Our team has been notified if error
            monitoring is enabled. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
