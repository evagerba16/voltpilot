import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import type { DashboardUpcomingJob } from "@/lib/dashboard/queries";
import {
  PROJECT_STATUS_STYLES,
  type ProjectStatus,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type DashboardUpcomingJobsProps = {
  jobs: DashboardUpcomingJob[];
};

export function DashboardUpcomingJobs({ jobs }: DashboardUpcomingJobsProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold tracking-tight">Upcoming Jobs</h2>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No upcoming jobs yet"
          description="Projects in estimating, proposal, or awarded status appear here."
          action={
            <Link href="/projects/new" className={buttonVariants({ size: "sm" })}>
              Create a project
            </Link>
          }
          className="flex-1 py-10"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={job.href}
                className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-muted/30"
              >
                <p className="min-w-0 truncate text-sm">
                  <span className="font-medium">{job.projectName}</span>
                  <span className="text-muted-foreground"> · {job.customerName}</span>
                  <span className="text-muted-foreground"> · {job.timingLabel}</span>
                </p>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    PROJECT_STATUS_STYLES[job.status as ProjectStatus] ??
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {job.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
