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
import type { VoltAiContextParams } from "@/lib/ai/context";
import { generateProposalIntelligence } from "@/lib/analytics/analytics-service";
import { buildForecastViewModel, compareRevenueTrend } from "@/lib/analytics/forecast-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { getAnalyticsData } from "@/lib/analytics/queries";
import type { AnalyticsData, AnalyticsFilters } from "@/lib/analytics/types";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import {
  getEstimateById,
  mapEstimateToBuilderState,
  verifyEstimateOwnership,
} from "@/lib/estimates/queries";
import { getProposalById, verifyProposalOwnership } from "@/lib/proposals/queries";

const VOLT_AI_ANALYTICS_FILTERS: AnalyticsFilters = {
  dateRange: "90d",
  customerId: "",
  projectId: "",
  projectStatus: "",
};

function analyticsFiltersForContext(
  context?: VoltAiContextParams
): AnalyticsFilters {
  return {
    ...VOLT_AI_ANALYTICS_FILTERS,
    customerId: context?.customerId ?? "",
    projectId: context?.projectId ?? "",
  };
}

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

function answerProfitDownQuestion(analytics: AnalyticsData) {
  const profitTrend = compareRevenueTrend(analytics.charts.profitTrend);
  const revenueTrend = compareRevenueTrend(analytics.charts.revenueTrend);
  const forecasts = buildForecastViewModel(analytics);
  const lowMarginCount = analytics.aiOpportunities.lowMarginEstimates.length;
  const costOverruns = analytics.estimating.costOverrunCount;
  const reasons: string[] = [];

  if (profitTrend?.direction === "down") {
    reasons.push(
      `Gross profit fell ${Math.abs(profitTrend.changePercent).toFixed(0)}% vs earlier in the period (${formatCurrency(profitTrend.prior)} → ${formatCurrency(profitTrend.latest)}).`
    );
  }

  if (
    analytics.executive.grossMarginPercent > 0 &&
    analytics.executive.grossMarginPercent < 15
  ) {
    reasons.push(
      `Average gross margin is ${formatPercent(analytics.executive.grossMarginPercent)}, below a healthy 15% target.`
    );
  }

  if (lowMarginCount > 0) {
    const worst = [...analytics.aiOpportunities.lowMarginEstimates].sort(
      (left, right) => left.marginPercent - right.marginPercent
    )[0];
    reasons.push(
      `${lowMarginCount} pipeline estimate(s) are below target margin${worst ? ` — lowest is "${worst.title}" at ${formatPercent(worst.marginPercent)}` : ""}.`
    );
  }

  if (costOverruns > 0) {
    reasons.push(
      `${costOverruns} active project(s) have actual costs exceeding the original estimate.`
    );
  }

  if (forecasts.profit.potentialProfitLost > 0) {
    reasons.push(
      `${formatCurrency(forecasts.profit.potentialProfitLost)} in profit is at risk from low-margin items still in the pipeline.`
    );
  }

  if (revenueTrend?.direction === "down") {
    reasons.push(
      `Accepted revenue is also down ${Math.abs(revenueTrend.changePercent).toFixed(0)}%, which reduces total profit even when margins hold steady.`
    );
  }

  if (reasons.length === 0) {
    return [
      `Profit looks stable over the last 90 days — ${formatCurrency(analytics.executive.grossProfit)} gross profit at ${formatPercent(analytics.executive.grossMarginPercent)} margin.`,
      "If profit feels lower month to month, check individual project actuals or switch to a shorter analytics range.",
    ].join(" ");
  }

  return [
    "Here's what's likely pulling profit down:",
    ...reasons.map((reason, index) => `${index + 1}. ${reason}`),
    "Start by reviewing low-margin estimates and jobs with cost overruns.",
  ].join("\n");
}

function answerMarginsLowQuestion(analytics: AnalyticsData) {
  const reasons: string[] = [];
  const margin = analytics.executive.grossMarginPercent;
  const lowMarginCount = analytics.aiOpportunities.lowMarginEstimates.length;
  const costOverruns = analytics.estimating.costOverrunCount;

  if (margin > 0 && margin < 15) {
    reasons.push(
      `Portfolio gross margin is ${formatPercent(margin)}, below a healthy 15% target.`
    );
  }

  if (lowMarginCount > 0) {
    const worst = [...analytics.aiOpportunities.lowMarginEstimates].sort(
      (left, right) => left.marginPercent - right.marginPercent
    )[0];
    reasons.push(
      `${lowMarginCount} open estimate(s) are below target margin${worst ? ` — "${worst.title}" is lowest at ${formatPercent(worst.marginPercent)}` : ""}.`
    );
  }

  const weakProjects = [...analytics.estimating.marginByProject]
    .filter((project) => project.marginPercent > 0 && project.marginPercent < 15)
    .sort((left, right) => left.marginPercent - right.marginPercent)
    .slice(0, 2);

  for (const project of weakProjects) {
    reasons.push(
      `${project.projectName} (${project.customerName}) is running at ${formatPercent(project.marginPercent)} margin.`
    );
  }

  if (costOverruns > 0) {
    reasons.push(
      `${costOverruns} active project(s) have actual costs exceeding the original estimate, which compresses realized margin.`
    );
  }

  if (reasons.length === 0) {
    return `Margins look healthy at ${formatPercent(margin)} gross margin across the portfolio. Review individual estimates if a specific job feels tight.`;
  }

  return [
    "Here's what's likely keeping margins low:",
    ...reasons.map((reason, index) => `${index + 1}. ${reason}`),
    "Review markup on low-margin estimates and jobs with cost overruns first.",
  ].join("\n");
}

function answerFollowUpTodayQuestion(analytics: AnalyticsData) {
  const staleProposals = [...analytics.aiOpportunities.staleProposals].sort(
    (left, right) => right.daysSinceSent - left.daysSinceSent
  );
  const staleCustomers = analytics.aiOpportunities.customersWithoutRecentProposal;
  const lines: string[] = [];

  if (staleProposals.length > 0) {
    lines.push("Proposals to follow up on:");
    for (const [index, proposal] of staleProposals.slice(0, 3).entries()) {
      lines.push(
        `${index + 1}. "${proposal.title}" — ${proposal.customerName}, sent ${proposal.daysSinceSent} day(s) ago`
      );
    }
  }

  if (staleCustomers.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Customers without a recent proposal:");
    for (const [index, customer] of staleCustomers.slice(0, 3).entries()) {
      lines.push(
        `${index + 1}. ${customer.companyName}${customer.daysSinceLastProposal ? ` — last proposal ${customer.daysSinceLastProposal} day(s) ago` : ""}`
      );
    }
  }

  if (lines.length === 0) {
    return "Nothing urgent flagged for follow-up today. Check sent proposals and customers with open opportunities to stay ahead.";
  }

  return ["Start with these follow-ups today:", ...lines].join("\n");
}

function answerPipelineReviewQuestion(analytics: AnalyticsData) {
  const forecasts = buildForecastViewModel(analytics);
  const stages = analytics.charts.projectPipeline.filter(
    (stage) => !["Lost", "Archived"].includes(stage.status)
  );
  const stageSummary = stages
    .filter((stage) => stage.count > 0)
    .map((stage) => `${stage.status}: ${stage.count}`)
    .join(", ");

  return [
    `Pipeline value: ${formatCurrency(analytics.executive.pipelineValue)}.`,
    `Expected revenue (next 30 days): ${formatCurrency(forecasts.revenue.expectedRevenue)} across ${forecasts.revenue.itemCount} weighted item(s).`,
    stageSummary ? `Active stages — ${stageSummary}.` : "No active pipeline stages yet.",
    analytics.aiOpportunities.staleProposals.length > 0
      ? `${analytics.aiOpportunities.staleProposals.length} sent proposal(s) may need follow-up.`
      : "Keep moving qualified leads into estimating.",
  ].join(" ");
}

function answerJobsAtRiskQuestion(analytics: AnalyticsData) {
  const lowMargin = [...analytics.estimating.marginByProject]
    .filter((project) => project.marginPercent > 0 && project.marginPercent < 15)
    .sort((left, right) => left.marginPercent - right.marginPercent)
    .slice(0, 3);
  const highLabor = analytics.aiOpportunities.highLaborProjects.slice(0, 3);
  const lines: string[] = [];

  if (analytics.estimating.costOverrunCount > 0) {
    lines.push(
      `${analytics.estimating.costOverrunCount} active project(s) have actual costs exceeding the original estimate.`
    );
  }

  if (lowMargin.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Low-margin jobs:");
    for (const [index, project] of lowMargin.entries()) {
      lines.push(
        `${index + 1}. ${project.projectName} (${project.customerName}) — ${formatPercent(project.marginPercent)} margin`
      );
    }
  }

  if (highLabor.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("High labor cost projects:");
    for (const [index, project] of highLabor.entries()) {
      lines.push(`${index + 1}. ${project.projectName} — ${formatPercent(project.laborPercent)} labor`);
    }
  }

  if (lines.length === 0) {
    return "No jobs flagged at risk right now. Watch projects with rising actuals or estimates below 15% margin.";
  }

  return ["Jobs to review:", ...lines].join("\n");
}

function answerMostProfitableCustomerQuestion(analytics: AnalyticsData) {
  const customers = [...analytics.customers.topCustomers].sort(
    (left, right) => right.revenue - left.revenue
  );

  if (customers.length === 0) {
    return "No customer revenue history yet. Accepted proposals will rank your most profitable customers.";
  }

  const leader = customers[0];
  const lines = customers.slice(0, 3).map(
    (customer, index) =>
      `${index + 1}. ${customer.companyName} — ${formatCurrency(customer.revenue)} revenue, ${customer.projectCount} project(s)`
  );

  return [`Top customer: ${leader.companyName} (${formatCurrency(leader.revenue)}).`, ...lines].join("\n");
}

function answerRevenuePredictionQuestion(analytics: AnalyticsData) {
  const forecasts = buildForecastViewModel(analytics);
  const trend = forecasts.revenueTrend;

  return [
    `Next 30 days: ${formatCurrency(forecasts.revenue.expectedRevenue)} expected revenue and ${formatCurrency(forecasts.profit.expectedGrossProfit)} gross profit.`,
    trend
      ? `Recent trend is ${trend.direction === "up" ? "up" : trend.direction === "down" ? "down" : "flat"} ${Math.abs(trend.changePercent).toFixed(1)}% vs earlier in the period.`
      : "Add pipeline activity to sharpen the forecast.",
    `${forecasts.revenue.itemCount} weighted pipeline item(s) at ${formatPercent(forecasts.revenue.historicalWinRate)} historical win rate.`,
  ].join(" ");
}

function answerVoltAiFromRules(question: string, analytics: AnalyticsData) {
  const normalized = question.trim().toLowerCase();

  if (normalized.includes("analyze") && normalized.includes("margin")) {
    return answerMarginsLowQuestion(analytics);
  }

  if (
    normalized.includes("profitable") &&
    normalized.includes("customer")
  ) {
    return answerMostProfitableCustomerQuestion(analytics);
  }

  if (
    normalized.includes("jobs at risk") ||
    normalized.includes("at risk") ||
    normalized.includes("risk")
  ) {
    return answerJobsAtRiskQuestion(analytics);
  }

  if (
    normalized.includes("predict") &&
    (normalized.includes("revenue") || normalized.includes("month"))
  ) {
    return answerRevenuePredictionQuestion(analytics);
  }

  if (normalized.includes("pipeline") || normalized.includes("review my pipeline")) {
    return answerPipelineReviewQuestion(analytics);
  }

  if (
    normalized.includes("follow up") ||
    normalized.includes("follow-up") ||
    normalized.includes("followup")
  ) {
    return answerFollowUpTodayQuestion(analytics);
  }

  if (
    normalized.includes("margin") &&
    (normalized.includes("low") ||
      normalized.includes("why") ||
      normalized.includes("thin") ||
      normalized.includes("compress"))
  ) {
    return answerMarginsLowQuestion(analytics);
  }

  if (
    (normalized.includes("most profitable") ||
      normalized.includes("highest margin") ||
      normalized.includes("best margin")) &&
    normalized.includes("estimate")
  ) {
    const estimates = [...analytics.recentEstimates]
      .filter((estimate) => estimate.profitMarginPercent > 0)
      .sort((left, right) => right.profitMarginPercent - left.profitMarginPercent)
      .slice(0, 3);

    if (estimates.length === 0) {
      return "No finalized estimates with margin data yet. Finalize estimates to compare profitability.";
    }

    return [
      "Your most profitable recent estimates:",
      ...estimates.map(
        (estimate, index) =>
          `${index + 1}. ${estimate.title} (${estimate.customerName}) — ${formatPercent(estimate.profitMarginPercent)} margin, ${formatCurrency(estimate.grandTotal)} total`
      ),
    ].join("\n");
  }

  if (
    normalized.includes("profit") &&
    (normalized.includes("down") ||
      normalized.includes("why") ||
      normalized.includes("lower") ||
      normalized.includes("declin") ||
      normalized.includes("drop"))
  ) {
    return answerProfitDownQuestion(analytics);
  }

  if (
    normalized.includes("profit") &&
    (normalized.includes("up") || normalized.includes("improv"))
  ) {
    const profitTrend = compareRevenueTrend(analytics.charts.profitTrend);
    if (profitTrend?.direction === "up") {
      return `Gross profit is up ${profitTrend.changePercent.toFixed(0)}% compared with earlier in the period. Keep closing high-margin work and maintain follow-through on sent proposals.`;
    }
    return `Portfolio gross margin is ${formatPercent(analytics.executive.grossMarginPercent)}. Raise markup on low-margin estimates and convert awarded work to protect profit growth.`;
  }

  if (
    normalized.includes("least profitable") ||
    normalized.includes("low margin") ||
    normalized.includes("least profit")
  ) {
    const projects = [...analytics.estimating.marginByProject]
      .filter((project) => project.marginPercent > 0)
      .sort((left, right) => left.marginPercent - right.marginPercent)
      .slice(0, 3);

    if (projects.length === 0) {
      return "No finalized estimates with margin data yet. Finalize estimates to compare project profitability.";
    }

    return projects
      .map(
        (project, index) =>
          `${index + 1}. ${project.projectName} (${project.customerName}) — ${formatPercent(project.marginPercent)} margin, ${formatCurrency(project.revenue)} revenue`
      )
      .join("\n");
  }

  if (
    normalized.includes("close rate") ||
    normalized.includes("win rate") ||
    normalized.includes("convert")
  ) {
    const proposalIntelligence = generateProposalIntelligence(
      analytics.proposalIntelligence,
      analytics.generatedAt
    );
    const followUps = proposalIntelligence.openFollowUpCount;

    return [
      `Your win rate is ${formatPercent(analytics.executive.winRate)} across ${analytics.proposals.totalDecided} decided proposals.`,
      followUps > 0
        ? `${followUps} open proposal(s) need follow-up — start with the oldest sent proposals.`
        : "Keep response times tight on sent proposals and confirm scope clarity before pricing.",
      analytics.executive.grossMarginPercent < 15
        ? "Thin margins can hurt close rates — review markup on low-margin estimates before rebidding."
        : "Focus on project types and customers that already drive accepted work.",
    ].join(" ");
  }

  if (normalized.includes("estimator") && normalized.includes("best")) {
    const ranked = [...analytics.ai.usageByEstimator].sort(
      (left, right) =>
        right.estimatesAssisted - left.estimatesAssisted ||
        right.sessionCount - left.sessionCount
    );

    if (ranked.length === 0) {
      return "No estimator AI usage recorded yet. AI-assisted sessions appear here once your team uses estimate review or the AI assistant.";
    }

    const leader = ranked[0];
    return [
      `${leader.displayName} leads with ${leader.estimatesAssisted} AI-assisted estimate(s) and ${leader.sessionCount} session(s).`,
      ranked.length > 1
        ? `Next: ${ranked[1].displayName} (${ranked[1].estimatesAssisted} assisted).`
        : null,
      `Portfolio estimate accuracy is ${formatPercent(analytics.estimating.estimateAccuracyPercent)}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Business snapshot: ${formatCurrency(analytics.executive.pipelineValue)} pipeline, ${formatPercent(analytics.executive.grossMarginPercent)} average gross margin, ${formatPercent(analytics.executive.winRate)} win rate.`,
    "Try asking to analyze margins, find your most profitable customer, or review your pipeline.",
  ].join(" ");
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
    const analytics = await getAnalyticsData(analyticsFiltersForContext(context));
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
