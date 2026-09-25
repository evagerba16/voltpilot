"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function parseRecoveryHash() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  if (params.get("type") !== "recovery") {
    return null;
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

/**
 * Supabase implicit recovery puts session tokens in the URL hash (never seen by the server).
 * Persist them via the browser client, then drop hash/query for a clean reset page.
 */
export function RecoveryHashSessionBootstrap() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }

    const recovery = parseRecoveryHash();

    if (!recovery) {
      return;
    }

    started.current = true;

    const supabase = createClient();

    void supabase.auth
      .setSession({
        access_token: recovery.accessToken,
        refresh_token: recovery.refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          router.replace(
            `/reset-password?error=${encodeURIComponent("Your reset link expired or is invalid. Request a new one.")}`
          );
          router.refresh();
          return;
        }

        router.replace("/reset-password");
        router.refresh();
      });
  }, [router]);

  return null;
}
