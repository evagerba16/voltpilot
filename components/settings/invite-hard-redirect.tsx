"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Forces a document navigation (not Next.js client routing) so auth route handlers
 * can set/clear cookies and HTTP redirects are followed correctly in Chrome.
 */
export function InviteHardRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Continuing to your invitation…
      </p>
    </main>
  );
}
