import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className ?? ""}`} />;
}

export default function ProjectDetailLoading() {
  return (
    <>
      <DashboardTopNav title="Project Details" />
      <PageMain>
        <div className="space-y-8">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-44 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28" />
            ))}
          </div>
          <SkeletonBlock className="h-56 w-full" />
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonBlock className="h-96 w-full" />
            <SkeletonBlock className="h-96 w-full" />
          </div>
        </div>
      </PageMain>
    </>
  );
}
