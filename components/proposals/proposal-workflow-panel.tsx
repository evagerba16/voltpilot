"use client";

import { useEffect, useState } from "react";
import { Eye, History, Mail, X } from "lucide-react";

import {
  fetchProposalWorkflowData,
  restoreProposalRevision,
} from "@/app/(dashboard)/proposals/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import type { ProposalTimelineEvent } from "@/lib/proposals/proposal-workflow-service";
import { formatProposalStatus, formatShortDate, formatTimelineTimestamp } from "@/lib/proposals/format";
import type {
  ProposalEditorState,
  ProposalEmailLog,
  ProposalRevision,
  ProposalStatusHistoryEntry,
  ProposalViewRecord,
} from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type ProposalWorkflowPanelProps = {
  open: boolean;
  proposalId: string;
  proposalTitle?: string;
  onClose: () => void;
  onRestored: (state: ProposalEditorState) => void;
  readOnly?: boolean;
};

type WorkflowData = {
  timeline: ProposalTimelineEvent[];
  statusHistory: ProposalStatusHistoryEntry[];
  views: ProposalViewRecord[];
  emails: ProposalEmailLog[];
  revisions: ProposalRevision[];
  stats: {
    viewCount: number;
    emailCount: number;
    revisionCount: number;
  };
};

function TimelineItem({ event }: { event: ProposalTimelineEvent }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "mt-1 size-2.5 rounded-full",
            event.completed ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
        <div className="min-h-8 w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{event.label}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
              event.completed ?
                "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
            )}
          >
            {event.completed ? "Complete" : "Pending"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTimelineTimestamp(event.timestamp)}
        </p>
      </div>
    </div>
  );
}

export function ProposalWorkflowPanel({
  open,
  proposalId,
  proposalTitle,
  onClose,
  onRestored,
  readOnly = false,
}: ProposalWorkflowPanelProps) {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();
  const { error: toastError, success } = useToast();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchProposalWorkflowData(proposalId).then((result) => {
      if (cancelled) return;
      setLoading(false);

      if ("error" in result && result.error) {
        setError(
          result.error ?? "We couldn't load workflow details. Try again in a moment."
        );
        return;
      }

      setData({
        timeline: result.timeline ?? [],
        statusHistory: result.statusHistory ?? [],
        views: result.views ?? [],
        emails: result.emails ?? [],
        revisions: result.revisions ?? [],
        stats: result.stats ?? { viewCount: 0, emailCount: 0, revisionCount: 0 },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  async function handleRestore(revision: ProposalRevision) {
    const confirmed = await confirm({
      title: `Restore version ${revision.version_number}?`,
      description:
        "Your current proposal content will be replaced with this saved version. Save again if you want to keep both.",
      confirmLabel: "Restore version",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    const result = await restoreProposalRevision(proposalId, revision.id);
    if ("error" in result && result.error) {
      toastError(result.error);
      return;
    }

    if ("state" in result && result.state) {
      onRestored(result.state);
      onClose();
      success(`Version ${revision.version_number} was restored.`);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close workflow panel"
      />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="text-base font-semibold">
              {proposalTitle ? `${proposalTitle} workflow` : "Proposal workflow"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner label="Loading workflow" />
              <span>Loading activity...</span>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {data ? (
            <>
              <section className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-center">
                  <p className="text-lg font-semibold">{data.stats.viewCount}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Views
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-center">
                  <p className="text-lg font-semibold">{data.stats.emailCount}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Emails
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-center">
                  <p className="text-lg font-semibold">{data.stats.revisionCount}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Versions
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Status timeline</h3>
                <div className="rounded-lg border border-border px-4 py-3">
                  {data.timeline.map((event) => (
                    <TimelineItem key={event.id} event={event} />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Eye className="size-4" />
                  Customer views
                </h3>
                {data.views.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Your customer has not opened this proposal yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.views.slice(0, 8).map((view) => (
                      <div
                        key={view.id}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {formatTimelineTimestamp(view.viewed_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">Customer opened the link</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Status history</h3>
                {data.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No status changes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.statusHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {entry.previous_status
                            ? formatProposalStatus(entry.previous_status)
                            : "Created"}{" "}
                          → {formatProposalStatus(entry.new_status)}
                        </p>
                        {entry.note ? (
                          <p className="text-muted-foreground">{entry.note}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(entry.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="size-4" />
                  Email log
                </h3>
                {data.emails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have not emailed this proposal yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.emails.map((email) => (
                      <div
                        key={email.id}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{email.recipient_email}</p>
                        <p className="text-muted-foreground">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(email.sent_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Version history</h3>
                {data.revisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Saved versions appear here when you save changes manually.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.revisions.map((revision) => (
                      <div
                        key={revision.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            v{revision.version_number} — {revision.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatShortDate(revision.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRestore(revision)}
                          disabled={readOnly}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProposalWorkflowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <History data-icon="inline-start" />
      Workflow
    </Button>
  );
}
