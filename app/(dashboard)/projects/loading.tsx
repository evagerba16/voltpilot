import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { TableSkeleton } from "@/components/ui/page-loading";

export default function ProjectsLoading() {
  return (
    <>
      <DashboardTopNav title="Projects" />
      <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
          <TableSkeleton rows={6} />
        </div>
      </div>
    </>
  );
}
