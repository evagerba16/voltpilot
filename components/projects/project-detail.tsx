"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Pencil,
  User,
} from "lucide-react";

import {
  archiveProject,
  restoreProject,
} from "@/app/(dashboard)/projects/actions";
import {
  ProjectEstimates,
  type ProjectEstimateItem,
} from "@/components/projects/project-estimates";
import { ProjectInsightsPanel } from "@/components/ai/project-insights-panel";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/projects/format";
import {
  PROJECT_STATUS_STYLES,
  type ProjectWithCustomer,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectDetailProps = {
  project: ProjectWithCustomer;
  estimates: ProjectEstimateItem[];
};

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm">
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

export function ProjectDetail({ project, estimates }: ProjectDetailProps) {
  const { can } = usePermissions();
  const canEdit = can("projects.edit");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();
  const isArchived =
    project.status === "Archived" || Boolean(project.archived_at);

  async function handleArchiveToggle() {
    const confirmed = await confirm({
      title: isArchived
        ? `Restore ${project.project_name}?`
        : `Archive ${project.project_name}?`,
      description: isArchived
        ? "This moves the project back to your active pipeline."
        : "This hides the project from your active list. You can restore it anytime.",
      confirmLabel: isArchived ? "Restore project" : "Archive project",
      variant: isArchived ? "default" : "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = isArchived
        ? await restoreProject(project.id)
        : await archiveProject(project.id);

      if (result?.error) {
        toastError(result.error);
        return;
      }

      success(
        isArchived
          ? `${project.project_name} was restored.`
          : `${project.project_name} was archived.`
      );
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to projects
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  PROJECT_STATUS_STYLES[project.status]
                )}
              >
                {project.status}
              </span>
              <span className="text-xs text-muted-foreground">
                Updated {formatDateTime(project.updated_at)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.project_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.customer.company_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>
                <Button
                  variant="outline"
                  onClick={handleArchiveToggle}
                  disabled={pending}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore data-icon="inline-start" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold">Project details</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <DetailItem
              label="Customer"
              value={project.customer.company_name}
              icon={Building2}
            />
            <DetailItem
              label="Project type"
              value={project.project_type}
            />
            <DetailItem
              label="General contractor"
              value={project.general_contractor || "—"}
            />
            <DetailItem
              label="Assigned estimator"
              value={project.assigned_estimator || "—"}
              icon={User}
            />
            <DetailItem
              label="Bid due date"
              value={formatDate(project.bid_due_date)}
              icon={Calendar}
            />
            <DetailItem
              label="Estimated contract value"
              value={formatCurrency(project.estimated_value)}
            />
            <DetailItem
              label="Project address"
              value={project.project_address || "—"}
              icon={MapPin}
            />
            <DetailItem
              label="Created"
              value={formatDate(project.created_at)}
            />
          </div>

          {project.notes ? (
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {project.notes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Customer contact</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-medium">{project.customer.contact_name}</p>
                <p className="text-muted-foreground">{project.customer.email}</p>
              </div>
              <Link
                href={`/customers?q=${encodeURIComponent(project.customer.company_name)}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                View customer
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ProjectInsightsPanel projectId={project.id} />

      <ProjectEstimates
        projectId={project.id}
        projectName={project.project_name}
        estimates={estimates}
        canCreate={!isArchived}
      />
    </div>
  );
}
