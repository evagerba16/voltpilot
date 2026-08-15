"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EstimateCopilotButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          Copilot reviewing...
        </>
      ) : (
        <>
          <Sparkles data-icon="inline-start" />
          Copilot
        </>
      )}
    </Button>
  );
}

export function CopilotRunReviewButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button onClick={onClick} variant="outline" className="w-full" disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          Reviewing estimate...
        </>
      ) : (
        <>
          <RefreshCw data-icon="inline-start" />
          Run review again
        </>
      )}
    </Button>
  );
}
