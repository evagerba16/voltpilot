"use client";

import { useState, useTransition } from "react";
import { Download, FileDown, Loader2 } from "lucide-react";

import { buildAnalyticsExportUrl } from "@/lib/analytics/url";
import type { AnalyticsData } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type AnalyticsExportButtonsProps = {
  filters: AnalyticsData["filters"];
};

async function downloadExport(url: string, fallbackFilename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    let message = "Export failed. Try again in a moment.";

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Non-JSON error body — keep default message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function AnalyticsExportButtons({ filters }: AnalyticsExportButtonsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport(type: "csv" | "pdf") {
    setError(null);
    startTransition(async () => {
      try {
        const url = buildAnalyticsExportUrl(type, filters);
        await downloadExport(
          url,
          type === "csv" ? "voltpilot-analytics.csv" : "voltpilot-analytics.pdf"
        );
      } catch (exportError) {
        setError(
          exportError instanceof Error
            ? exportError.message
            : "Export failed. Try again in a moment."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleExport("csv")}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          )}
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Export CSV
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => handleExport("pdf")}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          )}
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 size-4" />
          )}
          Export PDF
        </button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
