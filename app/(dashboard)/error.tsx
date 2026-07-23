"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We hit an unexpected error loading this page. Try again or return to your
        dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
