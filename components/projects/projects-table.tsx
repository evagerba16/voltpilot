"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  FolderKanban,
  Pencil,
} from "lucide-react";

import {
  archiveProject,
  restoreProject,
} from "@/app/(dashboard)/projects/actions";
import { ProjectsPagination } from "@/components/projects/projects-pagination";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatCurrency, formatDate } from "@/lib/projects/format";
import { buildProjectsUrl } from "@/lib/projects/url";
import {
  PROJECT_STATUS_STYLES,
  type ProjectArchiveFilter,
  type ProjectSortField,
  type ProjectWithCustomer,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectsTableProps = {
  projects: ProjectWithCustomer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  sort: ProjectSortField;
  order: "asc" | "desc";
  view: ProjectArchiveFilter;
  statusFilter: string;
  typeFilter: string;
  customerFilter: string;
};

type SortableColumn = {
  key: ProjectSortField;
  label: string;
  className?: string;
};

const columns: SortableColumn[] = [
  { key: "project_name", label: "Project" },
  { key: "status", label: "Status" },
  { key: "estimated_value", label: "Contract value", className: "hidden md:table-cell" },
  { key: "bid_due_date", label: "Bid due", className: "hidden lg:table-cell" },
  { key: "created_at", label: "Created", className: "hidden xl:table-cell" },
];

function SortIcon({
  column,
  sort,
  order,
}: {
  column: ProjectSortField;
  sort: ProjectSortField;
  order: "asc" | "desc";
}) {
  if (sort !== column) {
    return <ArrowUpDown className="size-3.5 opacity-40" />;
  }

  return order === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  );
}

function getNextOrder(
  column: ProjectSortField,
  sort: ProjectSortField,
  order: "asc" | "desc"
) {
  if (sort === column) {
    return order === "asc" ? "desc" : "asc";
  }

  return "asc";
}

function ProjectActions({ project }: { project: ProjectWithCustomer }) {
  const { can } = usePermissions();
  const canEdit = can("projects.edit");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();
  const isArchived =
    project.status === "Archived" || Boolean(project.archived_at);

  async function handleArchive() {
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

      if (result.error) {
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
    <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <Link
        href={`/projects/${project.id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label={`View ${project.project_name}`}
      >
        <Eye className="size-3.5" />
      </Link>
      {canEdit ? (
        <>
          <Link
            href={`/projects/${project.id}/edit`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            aria-label={`Edit ${project.project_name}`}
          >
            <Pencil className="size-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            aria-label={
              isArchived
                ? `Restore ${project.project_name}`
                : `Archive ${project.project_name}`
            }
          >
            {isArchived ? (
              <ArchiveRestore className="size-3.5" />
            ) : pending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}

export function ProjectsTable({
  projects,
  total,
  page,
  totalPages,
  search,
  sort,
  order,
  view,
  statusFilter,
  typeFilter,
  customerFilter,
}: ProjectsTableProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("projects.edit");

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-6 py-3 font-medium text-muted-foreground",
                    column.className
                  )}
                >
                  <Link
                    href={buildProjectsUrl({
                      q: search,
                      sort: column.key,
                      order: getNextOrder(column.key, sort, order),
                      view,
                      status: statusFilter,
                      type: typeFilter,
                      customer: customerFilter,
                      page: 1,
                    })}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    {column.label}
                    <SortIcon column={column.key} sort={sort} order={order} />
                  </Link>
                </th>
              ))}
              <th className="px-6 py-3 font-medium text-muted-foreground">
                Customer
              </th>
              <th className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell">
                Type
              </th>
              <th className="hidden px-6 py-3 font-medium text-muted-foreground lg:table-cell">
                General contractor
              </th>
              <th className="hidden px-6 py-3 font-medium text-muted-foreground xl:table-cell">
                Estimator
              </th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-0">
                  <EmptyState
                    icon={FolderKanban}
                    title={
                      search || statusFilter || typeFilter || customerFilter
                        ? "No projects match your filters"
                        : view === "archived"
                          ? "No archived projects"
                          : "No projects yet"
                    }
                    description={
                      search || statusFilter || typeFilter || customerFilter
                        ? "Try a different search term or clear your filters."
                        : view === "archived"
                          ? "Archived jobs appear here when you archive them from the active list."
                          : "Add a job to start estimating, building proposals, and tracking bids."
                    }
                    action={
                      search ||
                      statusFilter ||
                      typeFilter ||
                      customerFilter ? (
                        <Link
                          href="/projects"
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Clear filters
                        </Link>
                      ) : view !== "archived" && canEdit ? (
                        <Link href="/projects/new" className={buttonVariants()}>
                          Add project
                        </Link>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr
                  key={project.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/20",
                    (project.status === "Archived" || project.archived_at) &&
                      "opacity-70"
                  )}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-primary">{project.project_name}</p>
                    {project.project_address ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {project.project_address}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        PROJECT_STATUS_STYLES[project.status]
                      )}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 font-medium tabular-nums md:table-cell">
                    {formatCurrency(project.estimated_value)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {formatDate(project.bid_due_date)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground xl:table-cell">
                    {formatDate(project.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{project.customer.company_name}</p>
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                    {project.project_type}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {project.general_contractor || "—"}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground xl:table-cell">
                    {project.assigned_estimator || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <ProjectActions project={project} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <ProjectsPagination
          page={page}
          totalPages={totalPages}
          total={total}
          search={search}
          sort={sort}
          order={order}
          view={view}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          customerFilter={customerFilter}
        />
      ) : null}
    </div>
  );
}
