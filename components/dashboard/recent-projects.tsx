import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatDate } from "@/lib/projects/format";
import {
  PROJECT_STATUS_STYLES,
  type ProjectStatus,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type RecentProjectsProps = {
  items: Array<{
    id: string;
    project_name: string;
    status: string;
    updated_at: string;
    customer_name: string;
  }>;
};

export function RecentProjects({ items }: RecentProjectsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Recent projects</h2>
        <p className="text-sm text-muted-foreground">
          Latest updates across your active project pipeline
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Start with a customer and project, then build estimates and proposals from one workflow."
          action={
            <Link href="/projects/new" className={buttonVariants()}>
              Create your first project
            </Link>
          }
          className="py-12"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li
              key={item.id}
              className="table-row-interactive flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/projects/${item.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.project_name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {item.customer_name}
                </p>
              </Link>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    PROJECT_STATUS_STYLES[item.status as ProjectStatus] ??
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {item.status}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(item.updated_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
