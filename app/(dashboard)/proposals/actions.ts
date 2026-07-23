"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertPermission } from "@/lib/auth/get-team-context";
import {
  assertHexColor,
  assertSafeHttpUrl,
  assertValidEmail,
} from "@/lib/security/url-validation";
import { getCompanySettings } from "@/lib/company/queries";
import {
  buildDefaultProposalEmail,
  sendProposalEmail,
} from "@/lib/email/send-proposal";
import {
  buildProposalSeedData,
  mapProposalToEditorState,
  recalculateProposalAmount,
} from "@/lib/proposals/build-from-estimate";
import {
  isProposalLocked,
  PROPOSAL_LOCKED_MESSAGE,
} from "@/lib/proposals/proposal-lock";
import { formatCurrency } from "@/lib/proposals/format";
import {
  editorStateToRecord,
  getProposalById,
  verifyProposalOwnership,
} from "@/lib/proposals/queries";
import {
  createProposalRevision,
  logProposalEmail,
  recordProposalStatusChange,
} from "@/lib/proposals/revisions";
import { getProposalWorkflowSnapshot } from "@/lib/proposals/proposal-workflow-service";
import { getEstimateById } from "@/lib/estimates/queries";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import type { ProposalEditorState } from "@/lib/proposals/types";

type SaveOptions = {
  isAutosave?: boolean;
  createRevision?: boolean;
  revisionLabel?: string;
};

function parseEditorState(payload: ProposalEditorState) {
  return {
    title: payload.title.trim(),
    proposal_date: payload.proposal_date,
    expiration_date: payload.expiration_date || "",
    scope_of_work: payload.scope_of_work.trim(),
    materials_summary: payload.materials_summary.trim(),
    labor_summary: payload.labor_summary.trim(),
    equipment_summary: payload.equipment_summary.trim(),
    show_line_item_breakdown: payload.show_line_item_breakdown,
    assumptions: payload.assumptions.trim(),
    exclusions: payload.exclusions.trim(),
    terms_and_conditions: payload.terms_and_conditions.trim(),
    warranty_information: payload.warranty_information.trim(),
    customer_signature_name: payload.customer_signature_name.trim(),
    customer_signature_title: payload.customer_signature_title.trim(),
    contractor_signature_name: payload.contractor_signature_name.trim(),
    contractor_signature_title: payload.contractor_signature_title.trim(),
    notes: payload.notes.trim(),
    internal_notes: payload.internal_notes.trim(),
  };
}

async function generateProposalNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    return `PROP-${year}-${String(Date.now()).slice(-4)}`;
  }

  const sequence = (count ?? 0) + 1;
  return `PROP-${year}-${String(sequence).padStart(4, "0")}`;
}

async function assertProposalEditable(proposalId: string, organizationId: string) {
  const proposal = await getProposalById(proposalId);

  if (!proposal || proposal.organization_id !== organizationId) {
    return { error: "Proposal was not found." as const };
  }

  if (isProposalLocked(proposal.status)) {
    return { error: PROPOSAL_LOCKED_MESSAGE };
  }

  return { proposal };
}

async function persistProposal(
  proposalId: string,
  payload: ProposalEditorState,
  options: SaveOptions = {}
) {
  const context = await assertPermission("proposals.edit");

  const proposal = await getProposalById(proposalId);

  if (!proposal || proposal.organization_id !== context.organizationId) {
    return { error: "Proposal was not found." };
  }

  if (isProposalLocked(proposal.status)) {
    return { error: PROPOSAL_LOCKED_MESSAGE };
  }

  const input = parseEditorState(payload);

  if (!input.title) {
    return { error: "Enter a proposal title." };
  }

  const amount = recalculateProposalAmount(proposal.estimate_snapshot);
  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({
      ...editorStateToRecord(input),
      ...(amount !== null ? { amount } : {}),
      ...(options.isAutosave ? { last_autosaved_at: new Date().toISOString() } : {}),
    })
    .eq("id", proposalId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't save this proposal. Try again in a moment." };
  }

  if (options.createRevision) {
    await createProposalRevision(
      proposalId,
      context.userId,
      context.organizationId,
      input,
      options.revisionLabel ?? "Manual save"
    );
  }

  if (!options.isAutosave) {
    revalidatePath("/proposals");
    revalidatePath(`/proposals/${proposalId}`);
  }

  return { success: true, savedAt: new Date().toISOString() };
}

export async function createProposalFromEstimate(estimateId: string) {
  const context = await assertPermission("proposals.edit");

  const result = await getEstimateById(estimateId);

  if (!result) {
    return { error: "Estimate was not found." };
  }

  const company = await getCompanySettings(context.organizationId, context.userId);
  const seed = buildProposalSeedData({
    lineItems: result.lineItems,
    overheadPercent: result.estimate.overhead_percent,
    contingencyPercent: result.estimate.contingency_percent,
    profitMarginPercent: result.estimate.profit_margin_percent,
    taxPercent: result.estimate.tax_percent,
    company,
    projectName: result.estimate.project.project_name,
    customerContactName: result.estimate.project.customer.contact_name,
  });

  const proposalNumber = await generateProposalNumber(context.organizationId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      project_id: result.estimate.project_id,
      estimate_id: estimateId,
      proposal_number: proposalNumber,
      status: "Draft",
      amount: seed.amount,
      estimate_snapshot: seed.estimateSnapshot,
      company_snapshot: seed.companySnapshot,
      ...editorStateToRecord(seed.content),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "We couldn't create this proposal. Try again in a moment." };
  }

  await supabase
    .from("estimates")
    .update({ status: "Final" })
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId);

  await recordProposalStatusChange({
    proposalId: data.id,
    organizationId: context.organizationId,
    previousStatus: null,
    newStatus: "Draft",
    changedBy: context.userId,
    note: "Proposal created from estimate",
  });

  revalidatePath("/proposals");
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/proposals/${data.id}`);
}

export async function saveProposal(proposalId: string, payload: ProposalEditorState) {
  return persistProposal(proposalId, payload, {
    createRevision: true,
    revisionLabel: "Manual save",
  });
}

export async function autosaveProposal(proposalId: string, payload: ProposalEditorState) {
  return persistProposal(proposalId, payload, { isAutosave: true });
}

export async function duplicateProposal(proposalId: string) {
  const context = await assertPermission("proposals.edit");

  const proposal = await getProposalById(proposalId);

  if (!proposal) {
    return { error: "Proposal was not found." };
  }

  const ownsProposal = await verifyProposalOwnership(proposalId, context.organizationId);

  if (!ownsProposal) {
    return { error: "Proposal was not found." };
  }

  const proposalNumber = await generateProposalNumber(context.organizationId);
  const content = mapProposalToEditorState(proposal);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      project_id: proposal.project_id,
      estimate_id: proposal.estimate_id,
      proposal_number: proposalNumber,
      status: "Draft",
      amount: proposal.amount,
      estimate_snapshot: proposal.estimate_snapshot,
      company_snapshot: proposal.company_snapshot,
      ...editorStateToRecord({ ...content, title: `${proposal.title} (copy)` }),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "We couldn't duplicate this proposal. Try again in a moment." };
  }

  revalidatePath("/proposals");
  redirect(`/proposals/${data.id}`);
}

export async function archiveProposal(proposalId: string) {
  const context = await assertPermission("proposals.edit");
  const supabase = await createClient();

  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("status")
    .eq("id", proposalId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !proposal) {
    return { error: "Proposal was not found." };
  }

  const { error } = await supabase
    .from("proposals")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't archive this proposal. Try again in a moment." };
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
  return { success: true };
}

export async function deleteProposal(proposalId: string) {
  const context = await assertPermission("proposals.edit");

  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't delete this proposal. Try again in a moment." };
  }

  revalidatePath("/proposals");
  redirect("/proposals");
}

export async function sendProposalToCustomer(input: {
  proposalId: string;
  recipientEmail: string;
  subject: string;
  message: string;
}) {
  const context = await assertPermission("proposals.edit");
  const proposal = await getProposalById(input.proposalId);

  if (!proposal) {
    return { error: "Proposal was not found." };
  }

  const ownsProposal = await verifyProposalOwnership(
    input.proposalId,
    context.organizationId
  );

  if (!ownsProposal) {
    return { error: "Proposal was not found." };
  }

  const recipientEmail = assertValidEmail(input.recipientEmail);
  if (!recipientEmail) {
    return { error: "Enter a valid email address." };
  }

  if (!proposal.public_token) {
    return { error: "This proposal isn't ready to send yet. Save it and try again." };
  }

  const portalUrl = `${getSiteUrl()}/p/${proposal.public_token}`;
  const companyName =
    proposal.company_snapshot?.company_name ?? "Your Company";
  const amountLabel = formatCurrency(proposal.amount);

  const emailResult = await sendProposalEmail({
    to: recipientEmail,
    customerName: proposal.project.customer.company_name,
    companyName,
    proposalNumber: proposal.proposal_number ?? "Proposal",
    proposalTitle: proposal.title,
    amountLabel,
    subject: input.subject.trim(),
    message: input.message.trim(),
    portalUrl,
  });

  if (!emailResult.sent) {
    return {
      error:
        "We couldn't send this proposal by email. Check the address and try again.",
      emailSent: false,
    };
  }

  const supabase = await createClient();
  const sentAt = new Date().toISOString();
  const previousStatus = proposal.status;

  const { error } = await supabase
    .from("proposals")
    .update({
      status: "Sent",
      sent_at: sentAt,
      last_emailed_at: sentAt,
      email_send_count: (proposal.email_send_count ?? 0) + 1,
    })
    .eq("id", input.proposalId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "The email was sent, but we couldn't update the proposal status. Refresh the page." };
  }

  await logProposalEmail({
    proposalId: input.proposalId,
    organizationId: context.organizationId,
    sentBy: context.userId,
    recipientEmail,
    subject: input.subject.trim(),
    message: input.message.trim(),
    portalUrl,
  });

  if (previousStatus !== "Sent") {
    await recordProposalStatusChange({
      proposalId: input.proposalId,
      organizationId: context.organizationId,
      previousStatus,
      newStatus: "Sent",
      changedBy: context.userId,
      note: "Proposal emailed to customer",
    });
  }

  await supabase
    .from("projects")
    .update({ status: "Proposal Sent" })
    .eq("id", proposal.project_id)
    .eq("organization_id", context.organizationId);

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.proposalId}`);

  return {
    success: true,
    sentAt,
    portalUrl,
    emailSent: emailResult.sent,
    proposalTitle: proposal.title,
  };
}

export async function getProposalSendDefaults(proposalId: string) {
  await assertPermission("proposals.view");
  const proposal = await getProposalById(proposalId);

  if (!proposal) {
    return { error: "Proposal was not found." };
  }

  const companyName =
    proposal.company_snapshot?.company_name ?? "Your Company";

  return {
    recipientEmail: proposal.project.customer.email,
    ...buildDefaultProposalEmail({
      companyName,
      customerName: proposal.project.customer.contact_name,
      proposalNumber: proposal.proposal_number ?? "Proposal",
      projectName: proposal.project.project_name,
      amountLabel: formatCurrency(proposal.amount),
    }),
    portalUrl: proposal.public_token
      ? `${getSiteUrl()}/p/${proposal.public_token}`
      : null,
  };
}

export async function fetchProposalWorkflowData(proposalId: string) {
  const context = await assertPermission("proposals.view");
  const snapshot = await getProposalWorkflowSnapshot(
    proposalId,
    context.organizationId
  );

  if (!snapshot) {
    return { error: "Proposal was not found." };
  }

  return {
    timeline: snapshot.timeline,
    statusHistory: snapshot.statusHistory,
    views: snapshot.views,
    emails: snapshot.emails,
    revisions: snapshot.revisions,
    stats: snapshot.stats,
  };
}

export async function restoreProposalRevision(
  proposalId: string,
  revisionId: string
) {
  const context = await assertPermission("proposals.edit");
  const editable = await assertProposalEditable(proposalId, context.organizationId);

  if ("error" in editable) {
    return { error: editable.error };
  }

  const supabase = await createClient();

  const { data: revision, error } = await supabase
    .from("proposal_revisions")
    .select("*")
    .eq("id", revisionId)
    .eq("proposal_id", proposalId)
    .eq("organization_id", context.organizationId)
    .single();

  if (error || !revision) {
    return { error: "Revision was not found." };
  }

  const snapshot = revision.snapshot as ProposalEditorState;
  const result = await persistProposal(proposalId, snapshot, {
    createRevision: true,
    revisionLabel: `Restored from v${revision.version_number}`,
  });

  if (result.error) {
    return result;
  }

  return {
    success: true,
    state: snapshot,
    savedAt: result.savedAt,
  };
}

export async function markProposalSent(proposalId: string) {
  await assertPermission("proposals.edit");
  void proposalId;
  return {
    error: "Proposals must be sent to the customer by email.",
  };
}

export async function getProposalPortalUrl(proposalId: string) {
  await assertPermission("proposals.view");
  const proposal = await getProposalById(proposalId);

  if (!proposal?.public_token) {
    return { error: "Customer link isn't available for this proposal yet." };
  }

  return {
    portalUrl: `${getSiteUrl()}/p/${proposal.public_token}`,
  };
}

export async function addProposalMediaItem(input: {
  proposalId: string;
  kind: "photo" | "attachment";
  url: string;
  title?: string;
  caption?: string;
  fileName?: string;
}) {
  const context = await assertPermission("proposals.edit");
  const editable = await assertProposalEditable(
    input.proposalId,
    context.organizationId
  );

  if ("error" in editable) {
    return { error: editable.error };
  }

  const safeUrl = assertSafeHttpUrl(input.url);
  if (!safeUrl) {
    return { error: "Enter a valid link starting with http:// or https://." };
  }

  const { addProposalMedia } = await import("@/lib/proposals/proposal-media-queries");

  try {
    const media = await addProposalMedia({
      proposalId: input.proposalId,
      organizationId: context.organizationId,
      kind: input.kind,
      url: safeUrl,
      title: input.title,
      caption: input.caption,
      fileName: input.fileName,
    });

    revalidatePath(`/proposals/${input.proposalId}`);
    return { success: true, media };
  } catch {
    return {
      error: "We couldn't add this photo or file. Try again in a moment.",
    };
  }
}

export async function removeProposalMediaItem(proposalId: string, mediaId: string) {
  const context = await assertPermission("proposals.edit");
  const editable = await assertProposalEditable(proposalId, context.organizationId);

  if ("error" in editable) {
    return { error: editable.error };
  }

  const { deleteProposalMedia } = await import("@/lib/proposals/proposal-media-queries");

  try {
    await deleteProposalMedia(mediaId, proposalId, context.organizationId);
    revalidatePath(`/proposals/${proposalId}`);
    return { success: true };
  } catch {
    return {
      error: "We couldn't remove this photo or file. Try again in a moment.",
    };
  }
}

export async function updateProposalBranding(
  proposalId: string,
  branding: {
    customerLogoUrl?: string;
    brandPrimaryColor?: string;
    brandAccentColor?: string;
  }
) {
  const context = await assertPermission("proposals.edit");
  const editable = await assertProposalEditable(proposalId, context.organizationId);

  if ("error" in editable) {
    return { error: editable.error };
  }

  const customerLogoUrl = branding.customerLogoUrl?.trim()
    ? assertSafeHttpUrl(branding.customerLogoUrl)
    : null;

  if (branding.customerLogoUrl?.trim() && !customerLogoUrl) {
    return { error: "Enter a valid logo link starting with http:// or https://." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proposals")
    .update({
      customer_logo_url: customerLogoUrl,
      brand_primary_color: branding.brandPrimaryColor?.trim()
        ? assertHexColor(branding.brandPrimaryColor, "#1e3a5f")
        : null,
      brand_accent_color: branding.brandAccentColor?.trim()
        ? assertHexColor(branding.brandAccentColor, "#0ea5e9")
        : null,
    })
    .eq("id", proposalId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't update branding. Try again in a moment." };
  }

  revalidatePath(`/proposals/${proposalId}`);
  return { success: true };
}
