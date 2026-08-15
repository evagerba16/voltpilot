"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FolderKanban,
  Hammer,
  NotebookPen,
  RefreshCw,
  ScrollText,
  Send,
  Upload,
  XCircle,
} from "lucide-react";

import type { ProjectTimelineEvent, ProjectTimelineEventType } from "@/lib/projects/profile-types";
import { formatDateTime } from "@/lib/projects/format";
import { cn } from "@/lib/utils";

const TIMELINE_ICONS: Record<
  ProjectTimelineEventType,
  React.ComponentType<{ className?: string }>
> = {
  project_created: FolderKanban,
  estimate_created: ScrollText,
  estimate_finalized: ClipboardCheck,
  proposal_sent: Send,
  proposal_viewed: Eye,
  proposal_accepted: CheckCircle2,
  proposal_declined: XCircle,
  work_started: Hammer,
  inspection: ClipboardCheck,
  change_order: RefreshCw,
  job_log: NotebookPen,
  file_uploaded: Upload,
  project_completed: CheckCircle2,
  status_changed: RefreshCw,
};

const TIMELINE_COLORS: Record<ProjectTimelineEventType, string> = {
  project_created: "bg-primary/10 text-primary",
  estimate_created: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  estimate_finalized: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  proposal_sent: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  proposal_viewed: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  proposal_accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  proposal_declined: "bg-destructive/10 text-destructive",
  work_started: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  inspection: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  change_order: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  job_log: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  file_uploaded: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  project_completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  status_changed: "bg-muted text-muted-foreground",
};

type ProjectTimelineProps = {
  events: ProjectTimelineEvent[];
};

export function ProjectTimeline({ events }: ProjectTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Project milestones will appear here as estimates, proposals, and field work progress.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const Icon = TIMELINE_ICONS[event.type];
        const content = (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  TIMELINE_COLORS[event.type]
                )}
              >
                <Icon className="size-4" />
              </div>
              {index < events.length - 1 ? (
                <div className="mt-2 w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{event.title}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            </div>
          </div>
        );

        if (event.href) {
          return (
            <Link
              key={event.id}
              href={event.href}
              className="block rounded-xl px-1 transition-colors hover:bg-muted/30"
            >
              {content}
            </Link>
          );
        }

        return <div key={event.id}>{content}</div>;
      })}
    </div>
  );
}
