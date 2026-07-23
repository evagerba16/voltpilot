"use server";

import { assertPermission } from "@/lib/auth/get-team-context";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { runAiEstimateReview } from "@/lib/ai/estimate-review";
import { runProposalAssistant } from "@/lib/ai/proposal-assistant";
import { getProjectInsights } from "@/lib/ai/project-insights";
import type {
  AiEstimateReviewPayload,
  AiProposalAssistantPayload,
  AiProposalAssistantPayload as ProposalPayload,
} from "@/lib/ai/types";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import {
  getEstimateById,
  mapEstimateToBuilderState,
  verifyEstimateOwnership,
} from "@/lib/estimates/queries";
import { getProposalById, verifyProposalOwnership } from "@/lib/proposals/queries";

export async function aiReviewEstimate(payload: AiEstimateReviewPayload) {
  await assertPermission("ai.view");

  try {
    const result = await runAiEstimateReview(payload);
    return { result };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to run AI estimate review.",
    };
  }
}

export async function aiReviewEstimateById(estimateId: string) {
  const context = await assertPermission("ai.view");
  const ownsEstimate = await verifyEstimateOwnership(estimateId, context.organizationId);

  if (!ownsEstimate) {
    return { error: "Estimate not found." };
  }

  const record = await getEstimateById(estimateId);

  if (!record) {
    return { error: "Estimate not found." };
  }

  const { estimate, lineItems } = record;
  const state = mapEstimateToBuilderState(estimate, lineItems);

  return aiReviewEstimate({
    state,
    context: {
      projectName: record.estimate.project.project_name,
      customerName: record.estimate.project.customer.company_name,
      projectType: null,
      projectAddress: record.estimate.project.project_address,
    },
  });
}

export async function aiAssistProposal(payload: AiProposalAssistantPayload) {
  await assertPermission("ai.view");

  try {
    const result = await runProposalAssistant(payload);
    return { result };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate proposal content.",
    };
  }
}

export async function aiAssistProposalById(
  proposalId: string,
  task: ProposalPayload["task"]
) {
  const context = await assertPermission("ai.view");
  const ownsProposal = await verifyProposalOwnership(proposalId, context.organizationId);

  if (!ownsProposal) {
    return { error: "Proposal not found." };
  }

  const proposal = await getProposalById(proposalId);

  if (!proposal) {
    return { error: "Proposal not found." };
  }

  return aiAssistProposal({
    task,
    currentState: mapProposalToEditorState(proposal),
    context: {
      projectName: proposal.project.project_name,
      customerName: proposal.project.customer.company_name,
      companyName: proposal.company_snapshot?.company_name ?? "Your Company",
      estimateSnapshot: proposal.estimate_snapshot,
    },
  });
}

export async function aiGetProjectInsights(projectId: string) {
  const context = await assertPermission("ai.view");

  try {
    const result = await getProjectInsights(projectId, context.organizationId);
    return { result };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load project insights.",
    };
  }
}

export async function aiGetDashboardInsights() {
  const context = await assertPermission("ai.view");

  try {
    const result = await getDashboardInsights(context.organizationId);
    return { result };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to load AI insights.",
    };
  }
}
