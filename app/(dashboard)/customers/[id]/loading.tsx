import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function CustomerDetailLoading() {
  return (
    <>
      <DashboardTopNav title="Customer" />
      <PageMain>
        <div className="space-y-6">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-48" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <SkeletonBlock className="h-56" />
              <SkeletonBlock className="h-80" />
              <SkeletonBlock className="h-64" />
              <SkeletonBlock className="h-56" />
            </div>
            <div className="space-y-6">
              <SkeletonBlock className="h-52" />
              <SkeletonBlock className="h-72" />
            </div>
          </div>
        </div>
      </PageMain>
    </>
  );
}
