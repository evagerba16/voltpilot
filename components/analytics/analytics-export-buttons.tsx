"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Download, FileDown, Loader2 } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  function handleExport(type: "csv" | "pdf") {
    setError(null);
    setOpen(false);
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
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        )}
      >
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Download className="mr-2 size-4" />
        )}
        Export
        <ChevronDown className={cn("ml-2 size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Download className="size-4 text-muted-foreground" />
            Export CSV
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <FileDown className="size-4 text-muted-foreground" />
            Export PDF
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="absolute top-full mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
