"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Paperclip, Trash2 } from "lucide-react";

import {
  addProposalMediaItem,
  removeProposalMediaItem,
} from "@/app/(dashboard)/proposals/actions";
import { Button } from "@/components/ui/button";
import type { ProposalMediaItem, ProposalMediaKind } from "@/lib/proposals/types";

type ProposalMediaEditorProps = {
  proposalId: string;
  initialMedia: ProposalMediaItem[];
  onMediaChange?: (media: ProposalMediaItem[]) => void;
  readOnly?: boolean;
};

function MediaForm({
  kind,
  proposalId,
  onAdded,
}: {
  kind: ProposalMediaKind;
  proposalId: string;
  onAdded: (item: ProposalMediaItem) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addProposalMediaItem({
        proposalId,
        kind,
        url,
        title,
        caption,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.media) {
        onAdded(result.media);
        setUrl("");
        setTitle("");
        setCaption("");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">
            {kind === "photo" ? "Photo URL" : "Attachment URL"}
          </label>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {kind === "photo" ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Caption</label>
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="sm" onClick={handleAdd} disabled={pending || !url.trim()}>
        {pending ? "Adding..." : kind === "photo" ? "Add photo" : "Add attachment"}
      </Button>
    </div>
  );
}

export function ProposalMediaEditor({
  proposalId,
  initialMedia,
  onMediaChange,
  readOnly = false,
}: ProposalMediaEditorProps) {
  const [media, setMedia] = useState(initialMedia);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function updateMedia(next: ProposalMediaItem[]) {
    setMedia(next);
    onMediaChange?.(next);
  }

  async function handleRemove(mediaId: string) {
    setPendingId(mediaId);
    const result = await removeProposalMediaItem(proposalId, mediaId);
    setPendingId(null);

    if (!result.error) {
      updateMedia(media.filter((item) => item.id !== mediaId));
    }
  }

  const photos = media.filter((item) => item.kind === "photo");
  const attachments = media.filter((item) => item.kind === "attachment");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImagePlus className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Photos</h3>
        </div>
        {photos.length > 0 ? (
          <ul className="space-y-2">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{photo.title ?? photo.url}</span>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(photo.id)}
                    disabled={pendingId === photo.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {!readOnly ? (
          <MediaForm
            kind="photo"
            proposalId={proposalId}
            onAdded={(item) => updateMedia([...media, item])}
          />
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Attachments</h3>
        </div>
        {attachments.length > 0 ? (
          <ul className="space-y-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {attachment.title ?? attachment.file_name ?? attachment.url}
                </span>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(attachment.id)}
                    disabled={pendingId === attachment.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {!readOnly ? (
          <MediaForm
            kind="attachment"
            proposalId={proposalId}
            onAdded={(item) => updateMedia([...media, item])}
          />
        ) : null}
      </div>
    </div>
  );
}
