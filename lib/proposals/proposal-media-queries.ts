import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ProposalMediaItem,
  ProposalMediaKind,
} from "@/lib/proposals/types";

export async function getProposalMedia(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_media")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("proposal_media")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ProposalMediaItem[];
}

export async function addProposalMedia(input: {
  proposalId: string;
  organizationId: string;
  kind: ProposalMediaKind;
  url: string;
  title?: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sortOrder?: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_media")
    .insert({
      proposal_id: input.proposalId,
      organization_id: input.organizationId,
      kind: input.kind,
      url: input.url.trim(),
      title: input.title?.trim() || null,
      caption: input.caption?.trim() || null,
      file_name: input.fileName?.trim() || null,
      file_size: input.fileSize ?? null,
      mime_type: input.mimeType?.trim() || null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProposalMediaItem;
}

export async function deleteProposalMedia(
  mediaId: string,
  proposalId: string,
  organizationId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposal_media")
    .delete()
    .eq("id", mediaId)
    .eq("proposal_id", proposalId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }
}
