"use client";

import Link from "next/link";
import { ChevronDown, Eye, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ProposalPrimaryAction } from "@/lib/proposals/primary-action";
import { formatProposalStatus } from "@/lib/proposals/format";
import { PROPOSAL_STATUS_STYLES, type ProposalStatus } from "@/lib/proposals/types";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusIndicator({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: string | null;
}) {
  if (status === "idle") return null;

  const label =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? savedAt
          ? `Saved ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(savedAt))}`
          : "All changes saved"
        : "Couldn't save changes";

  return (
    <span
      className={cn(
        "text-sm",
        status === "error"
          ? "text-destructive"
          : status === "saving"
            ? "text-muted-foreground"
            : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {label}
    </span>
  );
}

type ProposalWorkspaceToolbarProps = {
  primaryAction: ProposalPrimaryAction;
  onPrimaryAction: () => void;
  pending?: boolean;
  canEdit: boolean;
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  saveStatus: SaveStatus;
  savedAt: string | null;
  onOpenOverflow: () => void;
};

export function ProposalWorkspaceToolbar({
  primaryAction,
  onPrimaryAction,
  pending = false,
  canEdit,
  mode,
  onModeChange,
  saveStatus,
  savedAt,
  onOpenOverflow,
}: ProposalWorkspaceToolbarProps) {
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? <SaveStatusIndicator status={saveStatus} savedAt={savedAt} /> : null}
        <div className="flex rounded-lg border border-border p-0.5">
          {canEdit ? (
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                mode === "edit" && "bg-muted text-foreground"
              )}
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              mode === "preview" && "bg-muted text-foreground"
            )}
          >
            <Eye className="size-3.5" />
            Preview
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            className={cn(buttonVariants({ className: "gap-2 rounded-full" }))}
            onClick={onPrimaryAction}
            disabled={pending}
          >
            <PrimaryIcon className="size-4" />
            {primaryAction.label}
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

type ProposalWorkspaceHeaderProps = {
  status: ProposalStatus;
  proposalNumber: string | null;
  title: string;
  isLocked: boolean;
  onTitleChange: (value: string) => void;
  project: {
    id: string;
    project_name: string;
    customer: { company_name: string };
  };
  estimateTitle: string | null;
  branding: {
    customerLogoUrl: string;
    brandPrimaryColor: string;
    brandAccentColor: string;
  };
  onBrandingChange: (branding: ProposalWorkspaceHeaderProps["branding"]) => void;
};

export function ProposalWorkspaceHeader({
  status,
  proposalNumber,
  title,
  isLocked,
  onTitleChange,
  project,
  estimateTitle,
  branding,
  onBrandingChange,
}: ProposalWorkspaceHeaderProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to proposals
      </Link>

      <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Proposal
            </p>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                PROPOSAL_STATUS_STYLES[status]
              )}
            >
              {formatProposalStatus(status)}
            </span>
            {proposalNumber ? (
              <span className="text-xs text-muted-foreground">{proposalNumber}</span>
            ) : null}
          </div>

          <div className="space-y-3">
            <label htmlFor="proposal-title" className="sr-only">
              Proposal title
            </label>
            <input
              id="proposal-title"
              value={title}
              disabled={isLocked}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus:ring-0 disabled:opacity-70 sm:text-3xl"
              placeholder="Proposal title"
            />
            <p className="text-sm text-muted-foreground">
              {status === "Accepted"
                ? ENTITY_PRIMARY_QUESTIONS.proposalAccepted
                : ENTITY_PRIMARY_QUESTIONS.proposal}
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
              {estimateTitle ? ` · From ${estimateTitle}` : ""}
            </p>
          </div>

          {!isLocked ? (
            <details className="group rounded-xl border border-border/60 bg-muted/10">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                Branding
              </summary>
              <div className="grid gap-4 border-t border-border/60 px-4 pb-4 pt-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="customer_logo_url" className="text-sm font-medium">
                    Customer logo URL (optional)
                  </label>
                  <input
                    id="customer_logo_url"
                    value={branding.customerLogoUrl}
                    onChange={(event) =>
                      onBrandingChange({
                        ...branding,
                        customerLogoUrl: event.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="brand_primary_color" className="text-sm font-medium">
                    Primary color
                  </label>
                  <input
                    id="brand_primary_color"
                    type="color"
                    value={branding.brandPrimaryColor || "#1e3a5f"}
                    onChange={(event) =>
                      onBrandingChange({
                        ...branding,
                        brandPrimaryColor: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="brand_accent_color" className="text-sm font-medium">
                    Accent color
                  </label>
                  <input
                    id="brand_accent_color"
                    type="color"
                    value={branding.brandAccentColor || "#0ea5e9"}
                    onChange={(event) =>
                      onBrandingChange({
                        ...branding,
                        brandAccentColor: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-1"
                  />
                </div>
              </div>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProposalWorkspacePriceContext({
  amount,
  grossMarginPercent,
  readinessScore,
}: {
  amount: string;
  grossMarginPercent: string;
  readinessScore?: number | null;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-6 rounded-2xl border border-border bg-muted/20 px-5 py-3 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Proposal value
        </p>
        <p className="text-xl font-bold tabular-nums tracking-tight">{amount}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Margin
        </p>
        <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {grossMarginPercent}
        </p>
      </div>
      {readinessScore !== null && readinessScore !== undefined ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Readiness
          </p>
          <p className="text-lg font-semibold tabular-nums">{readinessScore}/100</p>
        </div>
      ) : null}
    </div>
  );
}

export { SaveStatusIndicator };
