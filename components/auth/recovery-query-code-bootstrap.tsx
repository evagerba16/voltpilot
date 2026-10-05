"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Recovery sometimes lands on /reset-password with ?code= (PKCE) instead of going through
 * /auth/callback. Exchange on the same origin as the reset page when a verifier cookie exists.
 */
export function RecoveryQueryCodeBootstrap() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      return;
    }

    started.current = true;

    const supabase = createClient();

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
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
