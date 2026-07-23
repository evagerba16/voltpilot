import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { buildEstimatesUrl } from "@/lib/estimates/url";
import { cn } from "@/lib/utils";

type EstimatesPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  search: string;
  projectFilter: string;
};

export function EstimatesPagination({
  page,
  totalPages,
  total,
  search,
  projectFilter,
}: EstimatesPaginationProps) {
  if (total === 0) {
    return null;
  }

  const start = (page - 1) * 10 + 1;
  const end = Math.min(page * 10, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {`Showing ${start}–${end} of ${total} estimate${total === 1 ? "" : "s"}`}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildEstimatesUrl({ page: page - 1, q: search, project: projectFilter })}
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
          href={buildEstimatesUrl({ page: page + 1, q: search, project: projectFilter })}
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
