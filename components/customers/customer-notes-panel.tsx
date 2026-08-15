"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, Pin, Pencil, Trash2, X } from "lucide-react";

import {
  addCustomerNote,
  deleteCustomerNote,
  toggleCustomerNotePin,
  updateCustomerNote,
} from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import type { CustomerNote } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomerNotesPanelProps = {
  customerId: string;
  notes: CustomerNote[];
  canEdit: boolean;
  formatTimestamp: (value: string) => string;
};

export function CustomerNotesPanel({
  customerId,
  notes,
  canEdit,
  formatTimestamp,
}: CustomerNotesPanelProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("body", body);

    startTransition(async () => {
      const result = await addCustomerNote(customerId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setBody("");
      success("Note added.");
    });
  }

  function startEditing(note: CustomerNote) {
    setEditingNoteId(note.id);
    setEditBody(note.body);
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setEditBody("");
  }

  function saveEdit(noteId: string) {
    const formData = new FormData();
    formData.set("body", editBody);

    startTransition(async () => {
      const result = await updateCustomerNote(customerId, noteId, formData);

      if (result.error) {
        toastError(result.error);
        return;
      }

      cancelEditing();
      success("Note updated.");
    });
  }

  function handlePin(noteId: string) {
    startTransition(async () => {
      const result = await toggleCustomerNotePin(customerId, noteId);

      if (result.error) {
        toastError(result.error);
        return;
      }

      success("Note updated.");
    });
  }

  async function handleDelete(noteId: string) {
    const confirmed = await confirm({
      title: "Delete this note?",
      description: "This permanently removes the note from the customer timeline.",
      confirmLabel: "Delete note",
      variant: "destructive",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCustomerNote(customerId, noteId);

      if (result.error) {
        toastError(result.error);
        return;
      }

      success("Note deleted.");
    });
  }

  return (
    <div id="notes" className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold tracking-tight">Notes</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Timestamped notes for follow-ups, billing preferences, and relationship context.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Add a follow-up, billing note, or relationship detail..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || !body.trim()}>
                {pending ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus data-icon="inline-start" />
                    Add note
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : null}

        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No notes yet.{canEdit ? " Add the first note above." : ""}
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note, index) => (
              <article
                key={note.id}
                className={cn(
                  "rounded-xl border p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
                  note.is_pinned
                    ? "border-primary/25 bg-primary/5"
                    : "border-border/80 bg-muted/10"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {note.author_name ?? "Team member"}
                      </p>
                      {note.is_pinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Pin className="size-3" />
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(note.created_at)}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePin(note.id)}
                        disabled={pending}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
                      >
                        <Pin className={cn("size-4", note.is_pinned && "fill-current text-primary")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        disabled={pending}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Edit note"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={pending}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {editingNoteId === note.id ? (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                        <X data-icon="inline-start" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending || !editBody.trim()}
                        onClick={() => saveEdit(note.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
