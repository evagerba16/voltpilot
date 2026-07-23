"use client";

import { ProposalDocumentView } from "@/components/proposals/proposal-document-view";
import {
  buildProposalRenderModelFromPortal,
  buildProposalRenderModelFromRecord,
} from "@/lib/proposals/proposal-render-service";
import type {
  ProposalCompanySnapshot,
  ProposalEditorState,
  ProposalEstimateSnapshot,
  ProposalMediaItem,
  ProposalPortalData,
  ProposalWithRelations,
} from "@/lib/proposals/types";

type ProposalPreviewProps = {
  proposal: ProposalWithRelations;
  content: ProposalEditorState;
  company: ProposalCompanySnapshot;
  estimateSnapshot: ProposalEstimateSnapshot | null;
  media?: ProposalMediaItem[];
  customerSignatureData?: string | null;
  customerSignedAt?: string | null;
};

type PortalProposalPreviewProps = {
  portal: ProposalPortalData;
};

export function ProposalPreview({
  proposal,
  content,
  company,
  estimateSnapshot,
  media,
  customerSignatureData,
  customerSignedAt,
}: ProposalPreviewProps) {
  const model = buildProposalRenderModelFromRecord(
    proposal,
    content,
    company,
    estimateSnapshot,
    {
      media,
      customerSignatureData,
      customerSignedAt,
    }
  );

  return <ProposalDocumentView model={model} />;
}

export function PortalProposalPreview({ portal }: PortalProposalPreviewProps) {
  const model = buildProposalRenderModelFromPortal(portal);
  return <ProposalDocumentView model={model} />;
}
