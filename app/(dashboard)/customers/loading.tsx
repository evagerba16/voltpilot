import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { TableSkeleton } from "@/components/ui/page-loading";

export default function CustomersLoading() {
  return (
    <>
      <DashboardTopNav title="Customers" />
      <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          <TableSkeleton rows={6} />
        </div>
      </div>
    </>
  );
}
