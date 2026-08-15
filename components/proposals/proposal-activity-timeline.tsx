"use client";

import {
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  Mail,
  MessageSquare,
  PenLine,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

import { formatDateTime } from "@/lib/proposals/format";
import type { ProposalActivityEvent } from "@/lib/proposals/profile-types";
import { cn } from "@/lib/utils";

const EVENT_ICONS = {
  created: Sparkles,
  sent: Send,
  email: Mail,
  viewed: Eye,
  comment: MessageSquare,
  revision: FilePenLine,
  accepted: CheckCircle2,
  declined: XCircle,
  expired: Clock3,
  signed: PenLine,
} as const;

const EVENT_COLORS = {
  created: "bg-primary/10 text-primary",
  sent: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  email: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  viewed: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  comment: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  revision: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive",
  expired: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  signed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
} as const;

type ProposalActivityTimelineProps = {
  events: ProposalActivityEvent[];
  loading?: boolean;
};

export function ProposalActivityTimeline({
  events,
  loading = false,
}: ProposalActivityTimelineProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Proposal Activity</h2>
        <p className="text-sm text-muted-foreground">
          Timeline from creation through signature
        </p>
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="size-9 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Activity will appear here once the proposal is sent or viewed.
          </p>
        ) : (
          <ol className="space-y-0">
            {events.map((event, index) => {
              const Icon = EVENT_ICONS[event.type];
              const color = EVENT_COLORS[event.type];

              return (
                <li key={event.id} className="relative pb-6 last:pb-0">
                  {index < events.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[17px] top-10 h-[calc(100%-24px)] w-px bg-border"
                    />
                  ) : null}
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        color
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{event.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      <p className="mt-1 text-xs font-medium text-foreground/70">{event.actor}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
