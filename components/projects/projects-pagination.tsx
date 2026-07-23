import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { buildProjectsUrl } from "@/lib/projects/url";
import type { ProjectArchiveFilter } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectsPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  search: string;
  sort: string;
  order: string;
  view: ProjectArchiveFilter;
  statusFilter: string;
  typeFilter: string;
  customerFilter: string;
};

export function ProjectsPagination({
  page,
  totalPages,
  total,
  search,
  sort,
  order,
  view,
  statusFilter,
  typeFilter,
  customerFilter,
}: ProjectsPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * 10 + 1;
  const end = Math.min(page * 10, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? null
          : `Showing ${start}–${end} of ${total} project${total === 1 ? "" : "s"}`}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildProjectsUrl({
            page: page - 1,
            q: search,
            sort,
            order,
            view,
            status: statusFilter,
            type: typeFilter,
            customer: customerFilter,
          })}
          aria-disabled={page <= 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50"
          )}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Link>

        <span className="px-2 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <Link
          href={buildProjectsUrl({
            page: page + 1,
            q: search,
            sort,
            order,
            view,
            status: statusFilter,
            type: typeFilter,
            customer: customerFilter,
          })}
          aria-disabled={page >= totalPages}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= totalPages && "pointer-events-none opacity-50"
          )}
        >
          Next
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
