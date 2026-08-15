"use client";

import Link from "next/link";
import { ArrowUpRight, FolderKanban, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import type { CustomerProjectSummary } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Lead: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Estimating: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Proposal Sent": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Awarded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Lost: "bg-red-500/10 text-red-700 dark:text-red-400",
  Archived: "bg-muted text-muted-foreground",
};

function formatCurrency(value: number | null) {
  if (value == null || value <= 0) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type CustomerProjectsPanelProps = {
  customerId: string;
  projects: CustomerProjectSummary[];
  canEdit: boolean;
  formatTimestamp: (value: string) => string;
};

export function CustomerProjectsPanel({
  customerId,
  projects,
  canEdit,
  formatTimestamp,
}: CustomerProjectsPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Projects</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Active work linked to this customer.
          </p>
        </div>
        {canEdit ? (
          <Link
            href={`/projects/new?customer=${customerId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus data-icon="inline-start" />
            New project
          </Link>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <FolderKanban className="mx-auto size-8 text-muted-foreground/70" />
          <p className="mt-3 text-sm text-muted-foreground">
            No projects linked yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderKanban className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{project.project_name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                      STATUS_STYLES[project.status] ?? STATUS_STYLES.Lead
                    )}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Updated {formatTimestamp(project.updated_at)} · {formatCurrency(project.estimated_value)}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
