"use server";

import { assertPermission } from "@/lib/auth/get-team-context";
import { getOpenAIClient } from "@/lib/ai/client";
import {
  resolveVoltAiAskOpenAiFailure,
  rulesAnswerFallback,
  VOLT_AI_GENERIC_ERROR,
  type VoltAiAskResponse,
} from "@/lib/ai/volt-ai-ask-fallback";
import { getOpenAIConfig } from "@/lib/ai/env";
import { parseJsonResponse } from "@/lib/ai/parse-json";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { runAiEstimateReview } from "@/lib/ai/estimate-review";
import { runProposalAssistant } from "@/lib/ai/proposal-assistant";
import { getProjectInsights } from "@/lib/ai/project-insights";
import type {
  AiEstimateReviewPayload,
  AiProposalAssistantPayload,
  AiProposalAssistantPayload as ProposalPayload,
} from "@/lib/ai/types";
import {
  answerVoltAiFromRules,
  resolveVoltAiAnalyticsFilters,
} from "@/lib/ai/volt-ai-rules";
import type { VoltAiContextParams } from "@/lib/ai/context";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { getAnalyticsData } from "@/lib/analytics/queries";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import {
  getEstimateById,
  mapEstimateToBuilderState,
  verifyEstimateOwnership,
} from "@/lib/estimates/queries";
import { getProposalById, verifyProposalOwnership } from "@/lib/proposals/queries";

function contextPromptPrefix(context?: VoltAiContextParams): string {
  if (!context?.customerId && !context?.projectId && !context?.estimateId) {
    return "";
  }

  const parts: string[] = ["Context:"];

  if (context.customerId) {
    parts.push(`customer=${context.customerId}`);
  }

  if (context.projectId) {
    parts.push(`project=${context.projectId}`);
  }

  if (context.estimateId) {
    parts.push(`estimate=${context.estimateId}`);
  }

  if (context.focus) {
    parts.push(`focus=${context.focus}`);
  }

  return `${parts.join(" ")}. Prioritize this workflow context in your answer.\n\n`;
}

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


export async function askVoltAi(
  question: string,
  context?: VoltAiContextParams
): Promise<VoltAiAskResponse> {
  await assertPermission("ai.view");

  const trimmed = question.trim();
  if (!trimmed) {
    return { error: "Enter a question for Volt AI." };
  }

  const contextualQuestion = `${contextPromptPrefix(context)}${trimmed}`;
  let rulesAnswer = "";

  try {
    const analytics = await getAnalyticsData(
      resolveVoltAiAnalyticsFilters(contextualQuestion, context)
    );
    rulesAnswer = answerVoltAiFromRules(contextualQuestion, analytics);
    const { isConfigured } = getOpenAIConfig();
    const client = getOpenAIClient();

    if (!isConfigured || !client) {
      return (
        rulesAnswerFallback(rulesAnswer) ?? { error: VOLT_AI_GENERIC_ERROR }
      );
    }

    const { model } = getOpenAIConfig();

    try {
      const completionPromise = client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Volt AI, a concise business advisor for electrical contractors. Answer in 2-4 sentences using only the provided metrics.",
          },
          {
            role: "user",
            content: `Question: ${contextualQuestion}

Metrics:
- Pipeline value: ${formatCurrency(analytics.executive.pipelineValue)}
- Gross margin: ${formatPercent(analytics.executive.grossMarginPercent)}
- Gross profit (period): ${formatCurrency(analytics.executive.grossProfit)}
- Win rate: ${formatPercent(analytics.executive.winRate)}
- Revenue (period): ${formatCurrency(analytics.executive.revenue)}
- Low-margin pipeline estimates: ${analytics.aiOpportunities.lowMarginEstimates.length}
- Cost overrun projects: ${analytics.estimating.costOverrunCount}
- AI time saved (hours): ${analytics.ai.estimatedTimeSavedHours}
- Estimate accuracy: ${formatPercent(analytics.estimating.estimateAccuracyPercent)}

Rule-based draft answer:
${rulesAnswer}

Return JSON: { "answer": "..." }`,
          },
        ],
      });

      const completion = await Promise.race([
        completionPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("OpenAI answer timed out")), 4000);
        }),
      ]);

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = parseJsonResponse<{ answer?: string }>(content);

      return {
        answer: parsed?.answer?.trim() || rulesAnswer,
        source: parsed?.answer ? ("openai" as const) : ("rules" as const),
      };
    } catch {
      return resolveVoltAiAskOpenAiFailure(rulesAnswer);
    }
  } catch {
    return (
      rulesAnswerFallback(rulesAnswer) ?? { error: VOLT_AI_GENERIC_ERROR }
    );
  }
}
