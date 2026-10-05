"use client";

import { useEffect, useRef } from "react";

/**
 * When Supabase rejects redirect_to, recovery tokens can land on the site root (or another
 * public page) in the URL hash. Forward to /reset-password so RecoveryHashSessionBootstrap runs.
 */
export function RecoveryHashLandingRedirect() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || typeof window === "undefined") {
      return;
    }

    const { pathname, hash } = window.location;

    if (!hash || pathname === "/reset-password" || pathname.startsWith("/auth/callback")) {
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));

    if (params.get("type") !== "recovery") {
      return;
    }

    started.current = true;
    window.location.replace(`/reset-password${hash}`);
  }, []);

  return null;
}
