"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, Layers, MoreHorizontal } from "lucide-react";

import { SaveStatusIndicator } from "@/components/estimates/estimate-version-history";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import type { EstimatePrimaryAction } from "@/lib/estimates/primary-action";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EstimateWorkspaceToolbarProps = {
  primaryAction: EstimatePrimaryAction;
  onPrimaryAction: () => void;
  reviewLoading?: boolean;
  pending?: boolean;
  saveStatus: SaveStatus;
  savedAt: string | null;
  onOpenAssemblies: () => void;
  onOpenOverflow: () => void;
  showFinalize?: boolean;
  onFinalize?: () => void;
};

export function EstimateWorkspaceToolbar({
  primaryAction,
  onPrimaryAction,
  reviewLoading = false,
  pending = false,
  saveStatus,
  savedAt,
  onOpenAssemblies,
  onOpenOverflow,
  showFinalize = false,
  onFinalize,
}: EstimateWorkspaceToolbarProps) {
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onOpenAssemblies}>
          <Layers data-icon="inline-start" className="size-4" />
          Assemblies
        </Button>
        <SaveStatusIndicator status={saveStatus} savedAt={savedAt} />
      </div>

      <div className="flex flex-col gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showFinalize && onFinalize ? (
            <Button type="button" variant="outline" size="sm" onClick={onFinalize} disabled={pending}>
              Mark final
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn(buttonVariants({ className: "gap-2 rounded-full" }))}
            onClick={onPrimaryAction}
            disabled={pending || reviewLoading}
          >
            <PrimaryIcon className="size-4" />
            {reviewLoading && primaryAction.kind === "review"
              ? "Reviewing..."
              : primaryAction.label}
          </Button>
          <button
            type="button"
            onClick={onOpenOverflow}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-right">
          {primaryAction.context}
        </p>
      </div>
    </div>
  );
}

type EstimateWorkspaceHeaderProps = {
  project: {
    id: string;
    project_name: string;
    project_address: string | null;
    customer: { company_name: string };
  };
  statusLabel: string;
  title: string;
  isLocked: boolean;
  onTitleChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
};

export function EstimateWorkspaceHeader({
  project,
  statusLabel,
  title,
  isLocked,
  onTitleChange,
  notes,
  onNotesChange,
}: EstimateWorkspaceHeaderProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/estimates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to estimates
      </Link>

      <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Estimate
            </p>
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {statusLabel}
            </span>
          </div>

          <div className="space-y-3">
            <label htmlFor="estimate-title" className="sr-only">
              Estimate title
            </label>
            <input
              id="estimate-title"
              value={title}
              disabled={isLocked}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus:ring-0 disabled:opacity-70 sm:text-3xl"
              placeholder="Estimate title"
            />
            <p className="text-sm text-muted-foreground">
              {ENTITY_PRIMARY_QUESTIONS.estimate}
            </p>
            <p className="text-xs text-muted-foreground">
              <Link
                href={`/projects/${project.id}`}
                className="font-medium text-primary hover:underline"
              >
                {project.project_name}
              </Link>
              {" · "}
              {project.customer.company_name}
              {project.project_address ? ` · ${project.project_address}` : ""}
            </p>
          </div>

          <details className="group rounded-xl border border-border/60 bg-muted/10">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              Notes & assumptions
              {notes.trim() ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Has notes</span>
              ) : null}
            </summary>
            <div className="border-t border-border/60 px-4 pb-4 pt-3">
              <textarea
                id="estimate-notes"
                rows={3}
                value={notes}
                disabled={isLocked}
                onChange={(event) => onNotesChange(event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Assumptions, exclusions, or notes for your bid team"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Optional — visible on proposals generated from this estimate.
              </p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

export function EstimateWorkspacePriceContext({
  sellingPrice,
  grossMarginPercent,
}: {
  sellingPrice: string;
  grossMarginPercent: string;
}) {
  return (
    <div className="flex items-baseline gap-4 rounded-2xl border border-border bg-muted/20 px-5 py-3 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bid price
        </p>
        <p className="text-xl font-bold tabular-nums tracking-tight">{sellingPrice}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Margin
        </p>
        <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {grossMarginPercent}
        </p>
      </div>
    </div>
  );
}
