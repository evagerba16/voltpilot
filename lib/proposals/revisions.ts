import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ProposalEditorState,
  ProposalEmailLog,
  ProposalRevision,
  ProposalStatusHistoryEntry,
  ProposalViewRecord,
} from "@/lib/proposals/types";

export async function getNextProposalRevisionNumber(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_revisions")
    .select("version_number")
    .eq("proposal_id", proposalId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes("proposal_revisions")) {
      return 1;
    }

    throw new Error(error.message);
  }

  return (data?.version_number ?? 0) + 1;
}

export async function createProposalRevision(
  proposalId: string,
  userId: string,
  organizationId: string,
  snapshot: ProposalEditorState,
  label: string
) {
  const supabase = await createClient();
  const versionNumber = await getNextProposalRevisionNumber(proposalId);

  const { data, error } = await supabase
    .from("proposal_revisions")
    .insert({
      proposal_id: proposalId,
      user_id: userId,
      organization_id: organizationId,
      version_number: versionNumber,
      label,
      snapshot,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("proposal_revisions")) {
      return null;
    }

    throw new Error(error.message);
  }

  return data as ProposalRevision;
}

export async function getProposalRevisions(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_revisions")
    .select("id, proposal_id, user_id, version_number, label, snapshot, created_at")
    .eq("proposal_id", proposalId)
    .order("version_number", { ascending: false });

  if (error) {
    if (error.message.includes("proposal_revisions")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ProposalRevision[];
}

export async function recordProposalStatusChange(input: {
  proposalId: string;
  organizationId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy?: string | null;
  note?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("proposal_status_history").insert({
    proposal_id: input.proposalId,
    organization_id: input.organizationId,
    previous_status: input.previousStatus,
    new_status: input.newStatus,
    changed_by: input.changedBy ?? null,
    note: input.note ?? null,
  });

  if (error && !error.message.includes("proposal_status_history")) {
    throw new Error(error.message);
  }
}

export async function getProposalStatusHistory(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_status_history")
    .select("id, proposal_id, previous_status, new_status, note, created_at")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("proposal_status_history")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ProposalStatusHistoryEntry[];
}

export async function getProposalEmailLog(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_emails")
    .select("id, proposal_id, recipient_email, subject, message, portal_url, sent_at")
    .eq("proposal_id", proposalId)
    .order("sent_at", { ascending: false });

  if (error) {
    if (error.message.includes("proposal_emails")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ProposalEmailLog[];
}

export async function getProposalViews(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_views")
    .select("id, proposal_id, viewer_ip, user_agent, viewed_at")
    .eq("proposal_id", proposalId)
    .order("viewed_at", { ascending: false });

  if (error) {
    if (error.message.includes("proposal_views")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ProposalViewRecord[];
}

export async function logProposalEmail(input: {
  proposalId: string;
  organizationId: string;
  sentBy: string;
  recipientEmail: string;
  subject: string;
  message: string;
  portalUrl: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("proposal_emails").insert({
    proposal_id: input.proposalId,
    organization_id: input.organizationId,
    sent_by: input.sentBy,
    recipient_email: input.recipientEmail,
    subject: input.subject,
    message: input.message,
    portal_url: input.portalUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}
