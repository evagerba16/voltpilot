"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Calendar,
  Camera,
  CloudSun,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import {
  createProjectJobLog,
  deleteProjectJobLog,
  updateProjectJobLog,
  uploadProjectJobLogPhoto,
} from "@/app/(dashboard)/projects/job-costing-actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { formatDate } from "@/lib/projects/format";
import type { ProjectJobLog } from "@/lib/projects/job-costing-types";
import { cn } from "@/lib/utils";

type ProjectJobLogsPanelProps = {
  projectId: string;
  jobLogs: ProjectJobLog[];
  canEdit: boolean;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClassName = "text-sm font-medium";

export function ProjectJobLogsPanel({
  projectId,
  jobLogs,
  canEdit,
}: ProjectJobLogsPanelProps) {
  const [open, setOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ProjectJobLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const chronologicalLogs = useMemo(
    () =>
      [...jobLogs].sort(
        (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
      ),
    [jobLogs]
  );

  const totalHours = jobLogs.reduce((sum, log) => sum + log.hours_worked, 0);

  function handleCreate(formData: FormData) {
    submitLog(formData, null);
  }

  function handleUpdate(formData: FormData) {
    if (!editingLog) {
      return;
    }
    submitLog(formData, editingLog.id);
  }

  function submitLog(formData: FormData, logId: string | null) {
    setError(null);
    const logDate = String(formData.get("log_date") ?? "");
    const crewMembers = String(formData.get("crew_members") ?? "");
    const hoursWorked = Number(formData.get("hours_worked"));
    const workCompleted = String(formData.get("work_completed") ?? "");
    const delays = String(formData.get("delays") ?? "");
    const weather = String(formData.get("weather") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const photoFiles = formData.getAll("photos").filter((item) => item instanceof File) as File[];

    startTransition(async () => {
      const payload = {
        log_date: logDate,
        crew_members: crewMembers,
        hours_worked: Number.isFinite(hoursWorked) ? hoursWorked : 0,
        work_completed: workCompleted,
        delays: delays || undefined,
        weather: weather || undefined,
        notes: notes || undefined,
      };

      const result = logId
        ? await updateProjectJobLog(projectId, logId, payload)
        : await createProjectJobLog(projectId, payload);

      if (result.error) {
        setError(result.error ?? "Unable to save job log.");
        return;
      }

      let savedLogId = logId ?? undefined;
      if (!savedLogId && "id" in result && typeof result.id === "string") {
        savedLogId = result.id;
      }
      if (!savedLogId) {
        setError("Unable to save job log.");
        return;
      }
      for (const file of photoFiles) {
        if (file.size <= 0) {
          continue;
        }

        const uploadForm = new FormData();
        uploadForm.set("file", file);
        const uploadResult = await uploadProjectJobLogPhoto(
          projectId,
          savedLogId,
          uploadForm
        );

        if (uploadResult.error) {
          toastError(`Log saved, but photo upload failed: ${uploadResult.error}`);
        }
      }

      success(logId ? "Daily log updated." : "Daily log saved.");
      setOpen(false);
      setEditingLog(null);
    });
  }

  function openCreateModal() {
    setEditingLog(null);
    setError(null);
    setOpen(true);
  }

  function openEditModal(log: ProjectJobLog) {
    setEditingLog(log);
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingLog(null);
    setError(null);
  }

  async function handleDelete(logId: string) {
    const confirmed = await confirm({
      title: "Delete this daily log?",
      description: "This removes the log and any attached photos.",
      confirmLabel: "Delete log",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setDeletePending(logId);
    startTransition(async () => {
      const result = await deleteProjectJobLog(projectId, logId);

      if (result.error) {
        toastError(result.error);
        setDeletePending(null);
        return;
      }

      success("Daily log deleted.");
      setDeletePending(null);
    });
  }

  if (jobLogs.length === 0) {
    return (
      <>
        <details
          id="job-logs"
          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <Calendar className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Daily job logs</h2>
                <p className="text-sm text-muted-foreground">
                  None yet — capture crew hours and field progress
                </p>
              </div>
            </div>
            {canEdit ? (
              <Button
                size="sm"
                onClick={(event) => {
                  event.preventDefault();
                  openCreateModal();
                }}
              >
                <Plus data-icon="inline-start" className="size-4" />
                Add daily log
              </Button>
            ) : null}
          </summary>
        </details>

        <JobLogModal
          open={open}
          onClose={closeModal}
          onSubmit={handleCreate}
          error={error}
          pending={pending}
          initialLog={editingLog}
        />
      </>
    );
  }

  return (
    <section
      id="job-logs"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <Calendar className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Daily Job Logs</h2>
            <p className="text-sm text-muted-foreground">
              Field activity, crew hours, and site documentation
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={openCreateModal}>
            <Plus data-icon="inline-start" className="size-4" />
            Add daily log
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
        <SummaryMetric label="Total logs" value={String(jobLogs.length)} />
        <SummaryMetric label="Field hours logged" value={`${totalHours.toFixed(1)}h`} />
        <SummaryMetric
          label="Latest entry"
          value={jobLogs[0] ? formatDate(jobLogs[0].log_date) : "—"}
        />
      </div>

      <div className="relative px-6 py-6">
        {chronologicalLogs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No daily logs yet. Capture crew hours, work completed, and site photos from the
            field.
          </p>
        ) : (
          <ol className="space-y-0">
            {chronologicalLogs.map((log, index) => (
              <li key={log.id} className="relative pb-8 last:pb-0">
                {index < chronologicalLogs.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                  />
                ) : null}
                <JobLogEntry
                  log={log}
                  canEdit={canEdit}
                  deleting={deletePending === log.id}
                  onDelete={() => handleDelete(log.id)}
                  onEdit={() => openEditModal(log)}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <JobLogModal
        open={open}
        onClose={closeModal}
        onSubmit={editingLog ? handleUpdate : handleCreate}
        error={error}
        pending={pending}
        initialLog={editingLog}
      />
    </section>
  );
}

function JobLogEntry({
  log,
  canEdit,
  deleting,
  onDelete,
  onEdit,
}: {
  log: ProjectJobLog;
  canEdit: boolean;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="group relative pl-8 transition-opacity">
      <span
        aria-hidden="true"
        className="absolute left-0 top-1.5 size-[22px] rounded-full border-2 border-primary bg-background"
      />
      <div className="rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm transition-all duration-200 group-hover:border-border group-hover:shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{formatDate(log.log_date)}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {log.crew_members ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {log.crew_members}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {log.hours_worked}h
              </span>
              {log.weather ? (
                <span className="inline-flex items-center gap-1">
                  <CloudSun className="size-3.5" />
                  {log.weather}
                </span>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                onClick={onEdit}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                disabled={deleting}
                onClick={onDelete}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <p className="mt-3 text-sm">{log.work_completed}</p>

        {log.delays ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Delays: {log.delays}
          </p>
        ) : null}

        {log.notes ? (
          <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p>
        ) : null}

        {log.photos.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {log.photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/photo overflow-hidden rounded-lg border border-border bg-muted/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
                />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function JobLogModal({
  open,
  onClose,
  onSubmit,
  error,
  pending,
  initialLog,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  error: string | null;
  pending: boolean;
  initialLog?: ProjectJobLog | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = Boolean(initialLog);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit daily log" : "Add daily log"}
      description={
        isEdit
          ? "Update crew activity, hours, and site conditions for this entry."
          : "Record crew activity, hours, and site conditions for this project."
      }
    >
      <form action={onSubmit} className="space-y-4" key={initialLog?.id ?? "create"}>
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="log-date">
              Date
            </label>
            <input
              id="log-date"
              name="log_date"
              type="date"
              required
              defaultValue={initialLog?.log_date ?? today}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="log-hours">
              Hours worked
            </label>
            <input
              id="log-hours"
              name="hours_worked"
              type="number"
              min={0}
              step="0.25"
              defaultValue={initialLog?.hours_worked ?? 8}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="log-crew">
            Crew members
          </label>
          <input
            id="log-crew"
            name="crew_members"
            placeholder="e.g. Mike, Carlos, Apprentice"
            defaultValue={initialLog?.crew_members ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="log-work">
            Work completed
          </label>
          <textarea
            id="log-work"
            name="work_completed"
            required
            rows={3}
            placeholder="Rough-in panel feed, pulled homeruns to 2nd floor..."
            defaultValue={initialLog?.work_completed ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="log-delays">
              Delays
            </label>
            <input
              id="log-delays"
              name="delays"
              placeholder="Material wait, GC hold..."
              defaultValue={initialLog?.delays ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="log-weather">
              Weather
            </label>
            <input
              id="log-weather"
              name="weather"
              placeholder="Clear, 72°F"
              defaultValue={initialLog?.weather ?? ""}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="log-notes">
            Notes
          </label>
          <textarea
            id="log-notes"
            name="notes"
            rows={2}
            defaultValue={initialLog?.notes ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {!isEdit ? (
        <div className="space-y-2">
          <label className={cn(labelClassName, "inline-flex items-center gap-2")} htmlFor="log-photos">
            <Camera className="size-4" />
            Photos
          </label>
          <input
            id="log-photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
            {isEdit ? "Update daily log" : "Save daily log"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
