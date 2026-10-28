const DEV_PORTAL_TEST_FLAG = "1";

/** Full gate for server actions — never weakens production send/readiness. */
export function assertDevPortalTestEnabled(): { error: string } | null {
  if (process.env.NODE_ENV !== "development") {
    return {
      error:
        "Portal test send is only available when NODE_ENV is development.",
    };
  }

  if (process.env.VERCEL_ENV === "production") {
    return {
      error: "Portal test send is not available on Vercel production deployments.",
    };
  }

  if (process.env.VOLTPILOT_DEV_PORTAL_TEST?.trim() !== DEV_PORTAL_TEST_FLAG) {
    return {
      error:
        "Set VOLTPILOT_DEV_PORTAL_TEST=1 in .env.local to enable portal test send.",
    };
  }

  return null;
}

/** Client may show dev controls in local development; the server action enforces the full gate. */
export function isDevPortalTestUiVisible() {
  return process.env.NODE_ENV === "development";
}
