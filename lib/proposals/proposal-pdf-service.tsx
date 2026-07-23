import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import { getProposalMedia } from "@/lib/proposals/proposal-media-queries";
import {
  buildProposalRenderModelFromPortal,
  buildProposalRenderModelFromRecord,
  estimatePdfPageCount,
} from "@/lib/proposals/proposal-render-service";
import { ProposalPdfDocument } from "@/lib/proposals/pdf-document";
import { getProposalById, verifyProposalOwnership } from "@/lib/proposals/queries";
import type { ProposalCompanySnapshot, ProposalPortalData } from "@/lib/proposals/types";
import { renderToBuffer } from "@react-pdf/renderer";

function defaultCompanySnapshot(): ProposalCompanySnapshot {
  return {
    company_name: "Your Company",
    company_logo_url: null,
    address_lines: [],
    phone: null,
    email: null,
    website: null,
    license_number: null,
  };
}

function buildPdfFilename(proposalNumber: string | null, title: string) {
  return `${proposalNumber ?? "proposal"}-${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.pdf`;
}

async function persistPdfMetadata(
  proposalId: string,
  organizationId: string,
  pageCount: number
) {
  const supabase = await createClient();
  await supabase
    .from("proposals")
    .update({
      pdf_generated_at: new Date().toISOString(),
      pdf_page_count: pageCount,
    })
    .eq("id", proposalId)
    .eq("organization_id", organizationId);
}

export async function generateProposalPdfBuffer(
  proposalId: string,
  organizationId: string
) {
  const proposal = await getProposalById(proposalId);
  const ownsProposal = await verifyProposalOwnership(proposalId, organizationId);

  if (!proposal || !ownsProposal) {
    return null;
  }

  const content = mapProposalToEditorState(proposal);
  const company = proposal.company_snapshot ?? defaultCompanySnapshot();
  const media = await getProposalMedia(proposalId);
  const model = buildProposalRenderModelFromRecord(
    proposal,
    content,
    company,
    proposal.estimate_snapshot,
    {
      media,
      customerSignatureData: proposal.customer_signature_data,
      customerSignedAt: proposal.customer_signed_at,
    }
  );

  const pageCount = estimatePdfPageCount(model);
  const buffer = await renderToBuffer(<ProposalPdfDocument model={model} />);

  await persistPdfMetadata(proposalId, organizationId, pageCount);

  return {
    buffer,
    filename: buildPdfFilename(proposal.proposal_number, proposal.title),
    pageCount,
  };
}

export async function generatePortalProposalPdfBuffer(portal: ProposalPortalData) {
  const model = buildProposalRenderModelFromPortal({
    ...portal,
    media: portal.media ?? [],
  });
  const pageCount = estimatePdfPageCount(model);
  const buffer = await renderToBuffer(<ProposalPdfDocument model={model} />);

  return {
    buffer,
    filename: buildPdfFilename(portal.proposal_number, portal.title),
    pageCount,
  };
}

export const generateProposalPdfPreviewBuffer = generateProposalPdfBuffer;
