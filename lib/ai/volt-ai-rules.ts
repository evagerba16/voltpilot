import { generateProposalIntelligence } from "@/lib/analytics/analytics-service";
import { generateAiOpportunities } from "@/lib/analytics/ai-insights-service";
import { buildForecastViewModel, compareRevenueTrend } from "@/lib/analytics/forecast-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type {
  AnalyticsData,
  AnalyticsDateRange,
  AnalyticsFilters,
} from "@/lib/analytics/types";
import type { VoltAiContextParams } from "@/lib/ai/context";

export const DEFAULT_VOLT_AI_ANALYTICS_FILTERS: AnalyticsFilters = {
  dateRange: "90d",
  customerId: "",
  projectId: "",
  projectStatus: "",
};

export type VoltAiRulesIntent = "year_review" | "business_summary" | "specific";

export type VoltAiQuestionIntent = {
  intent: VoltAiRulesIntent;
  preferredDateRange?: AnalyticsDateRange;
};

type ScannableSection = { label: string; value: string } | string;

const NO_DATA_YET = "No data yet";

function normalizeVoltAiQuestion(question: string): string {
  return question
    .replace(/^context:[\s\S]*?(?:\n\n|$)/, "")
    .trim()
    .toLowerCase();
}

function hasSpecificTopicKeyword(normalized: string): boolean {
  return /margin|profit|pipeline|proposal|estimate|customer|revenue|risk|convert|follow|estimator|labor|material|close rate|win rate|jobs at risk|profitable/.test(
    normalized
  );
}

function matchesYearReview(normalized: string): boolean {
  if (/\b(ytd|year to date|year-to-date)\b/.test(normalized)) {
    return true;
  }

  if (
    /\b(year review|annual review|this year|my year|how(?:'s| is| has) my year)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  return /^(?:my |this |the )?year[!.?]*$/.test(normalized.trim());
}

function matchesBusinessSummary(normalized: string): boolean {
  return (
    /\b(how am i doing|how are we doing|how(?:'s| is) business|business review|overview|summary|status update|what should i focus on|give me a recap|recap)\b/.test(
      normalized
    ) ||
    /\b(how are things|how(?:'s| is) it going)\b/.test(normalized)
  );
}

function isShortConversationalQuestion(normalized: string): boolean {
  const cleaned = normalized.replace(/[.!?]+$/, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  return words.length <= 4 && !hasSpecificTopicKeyword(normalized);
}

export function detectVoltAiQuestionIntent(question: string): VoltAiQuestionIntent {
  const normalized = normalizeVoltAiQuestion(question);

  if (matchesYearReview(normalized)) {
    return { intent: "year_review", preferredDateRange: "ytd" };
  }

  if (matchesBusinessSummary(normalized) || isShortConversationalQuestion(normalized)) {
    return { intent: "business_summary" };
  }

  return { intent: "specific" };
}

export function resolveVoltAiAnalyticsFilters(
  question: string,
  context?: VoltAiContextParams,
  baseFilters: AnalyticsFilters = DEFAULT_VOLT_AI_ANALYTICS_FILTERS
): AnalyticsFilters {
  const intent = detectVoltAiQuestionIntent(question);

  return {
    ...baseFilters,
    customerId: context?.customerId ?? "",
    projectId: context?.projectId ?? "",
    dateRange: intent.preferredDateRange ?? baseFilters.dateRange,
  };
}

function periodLabel(dateRange: AnalyticsDateRange): string {
  const labels: Record<AnalyticsDateRange, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "12m": "Last 12 months",
    ytd: "Year-to-date",
    all: "All time",
  };

  return labels[dateRange] ?? "Period";
}

function formatScannableAnswer(
  title: string,
  sections: ScannableSection[],
  footer: string[] = []
): string {
  const lines = [title, ""];

  for (const section of sections) {
    if (typeof section === "string") {
      lines.push(section);
      continue;
    }

    lines.push(`${section.label}: ${section.value}`);
  }

  if (footer.length > 0) {
    lines.push("", ...footer);
  }

  return lines.join("\n");
}

function revenueLabel(dateRange: AnalyticsDateRange): string {
  return dateRange === "ytd" ? "Year-to-date revenue" : "Revenue";
}

function hasRevenueData(analytics: AnalyticsData): boolean {
  return analytics.executive.revenue > 0;
}

function hasProfitData(analytics: AnalyticsData): boolean {
  return (
    analytics.executive.grossProfit > 0 ||
    (analytics.executive.revenue > 0 && analytics.executive.grossMarginPercent > 0)
  );
}

function hasActivityData(analytics: AnalyticsData): boolean {
  return (
    analytics.executive.totalEstimates > 0 ||
    analytics.executive.totalProposals > 0 ||
    analytics.executive.activeProjects > 0
  );
}

function hasWinRateData(analytics: AnalyticsData): boolean {
  return analytics.proposals.totalDecided > 0;
}

function hasAnyBusinessData(analytics: AnalyticsData): boolean {
  return (
    hasRevenueData(analytics) ||
    hasProfitData(analytics) ||
    hasActivityData(analytics) ||
    hasWinRateData(analytics) ||
    getBestCustomer(analytics) !== null ||
    getMostProfitableJob(analytics) !== null
  );
}

function formatActivitySummary(analytics: AnalyticsData): string {
  if (!hasActivityData(analytics)) {
    return NO_DATA_YET;
  }

  return `${analytics.executive.totalEstimates} estimates · ${analytics.executive.totalProposals} proposals · ${analytics.executive.activeProjects} active jobs`;
}

function formatWinRateSummary(analytics: AnalyticsData): string {
  if (!hasWinRateData(analytics)) {
    return NO_DATA_YET;
  }

  return `${formatPercent(analytics.executive.winRate)} (${analytics.proposals.totalDecided} decided)`;
}

function formatProfitSummary(analytics: AnalyticsData): string {
  if (!hasProfitData(analytics)) {
    return NO_DATA_YET;
  }

  return `${formatCurrency(analytics.executive.grossProfit)} (${formatPercent(analytics.executive.grossMarginPercent)} margin)`;
}

function buildBusinessReviewFooter(analytics: AnalyticsData): string[] {
  const concern = pickPrimaryConcern(analytics);
  const opportunity = pickPrimaryOpportunity(analytics);
  const focus = pickFocusRecommendation(analytics, concern, opportunity);

  return [
    concern ? `Concern: ${concern}` : null,
    opportunity ? `Opportunity: ${opportunity}` : null,
    `What to focus on next: ${focus}`,
  ].filter((line): line is string => Boolean(line));
}

function getBestCustomer(analytics: AnalyticsData) {
  const customers = [...analytics.customers.topCustomers].sort(
    (left, right) => right.revenue - left.revenue
  );

  if (customers.length === 0 || customers[0].revenue <= 0) {
    return null;
  }

  return {
    name: customers[0].companyName,
    revenue: customers[0].revenue,
  };
}

function getMostProfitableJob(analytics: AnalyticsData) {
  const fromProjects = [...analytics.projects.mostProfitableProjects].sort(
    (left, right) => right.marginPercent - left.marginPercent
  )[0];

  if (fromProjects && fromProjects.marginPercent > 0) {
    return {
      name: fromProjects.projectName,
      customerName: fromProjects.customerName,
      marginPercent: fromProjects.marginPercent,
      profit: fromProjects.profit,
    };
  }

  const fromEstimates = [...analytics.estimating.marginByProject]
    .filter((project) => project.marginPercent > 0)
    .sort((left, right) => right.marginPercent - left.marginPercent)[0];

  if (!fromEstimates) {
    return null;
  }

  return {
    name: fromEstimates.projectName,
    customerName: fromEstimates.customerName,
    marginPercent: fromEstimates.marginPercent,
    profit: fromEstimates.revenue,
  };
}

function pickPrimaryConcern(analytics: AnalyticsData): string | null {
  if (analytics.estimating.costOverrunCount > 0) {
    return `${analytics.estimating.costOverrunCount} active job(s) are running over estimate — review actuals before margin slips further.`;
  }

  if (
    analytics.executive.grossMarginPercent > 0 &&
    analytics.executive.grossMarginPercent < 15
  ) {
    return `Gross margin is ${formatPercent(analytics.executive.grossMarginPercent)}, below a healthy 15% target.`;
  }

  const profitTrend = compareRevenueTrend(analytics.charts.profitTrend);
  if (profitTrend?.direction === "down") {
    return `Profit is down ${Math.abs(profitTrend.changePercent).toFixed(0)}% compared with earlier in the period.`;
  }

  const revenueTrend = compareRevenueTrend(analytics.charts.revenueTrend);
  if (revenueTrend?.direction === "down") {
    return `Accepted revenue is down ${Math.abs(revenueTrend.changePercent).toFixed(0)}% compared with earlier in the period.`;
  }

  if (analytics.aiOpportunities.lowMarginEstimates.length > 0) {
    const worst = [...analytics.aiOpportunities.lowMarginEstimates].sort(
      (left, right) => left.marginPercent - right.marginPercent
    )[0];
    return `${analytics.aiOpportunities.lowMarginEstimates.length} open estimate(s) are below target margin${worst ? ` — "${worst.title}" is lowest at ${formatPercent(worst.marginPercent)}` : ""}.`;
  }

  return null;
}

function pickPrimaryOpportunity(analytics: AnalyticsData): string | null {
  const opportunities = generateAiOpportunities(
    analytics.aiOpportunities,
    analytics.generatedAt,
    "rules"
  ).opportunities;

  const candidate =
    opportunities.find((opportunity) => opportunity.severity === "high") ??
    opportunities.find((opportunity) => opportunity.severity === "medium") ??
    opportunities[0];

  if (!candidate) {
    return null;
  }

  return `${candidate.title} — ${candidate.recommendedAction}`;
}

function pickFocusRecommendation(
  analytics: AnalyticsData,
  concern: string | null,
  opportunity: string | null
): string {
  if (!hasAnyBusinessData(analytics)) {
    return "Add a customer and project, create your first estimate, and send a proposal to start building your business picture.";
  }

  if (analytics.aiOpportunities.staleProposals.length > 0) {
    const oldest = [...analytics.aiOpportunities.staleProposals].sort(
      (left, right) => right.daysSinceSent - left.daysSinceSent
    )[0];
    return `Follow up on "${oldest.title}" (${oldest.customerName}) — it has been out ${oldest.daysSinceSent} day(s).`;
  }

  if (concern?.includes("over estimate")) {
    return "Review jobs with cost overruns first and rebaseline labor or material assumptions.";
  }

  if (concern?.includes("margin")) {
    return "Raise markup on the lowest-margin open estimates before sending new proposals.";
  }

  if (opportunity) {
    return opportunity.split(" — ").slice(-1)[0] ?? opportunity;
  }

  if (analytics.executive.pipelineValue > 0) {
    return "Convert qualified pipeline into sent proposals while margins are still healthy.";
  }

  return "Build estimating activity on active projects, then move the strongest bids into proposals.";
}

function buildBusinessReviewSections(analytics: AnalyticsData): ScannableSection[] {
  const sections: ScannableSection[] = [
    {
      label: revenueLabel(analytics.filters.dateRange),
      value: hasRevenueData(analytics)
        ? formatCurrency(analytics.executive.revenue)
        : NO_DATA_YET,
    },
    {
      label: "Gross profit / margin",
      value: formatProfitSummary(analytics),
    },
    {
      label: "Estimates, proposals, and jobs",
      value: formatActivitySummary(analytics),
    },
    {
      label: "Win rate",
      value: formatWinRateSummary(analytics),
    },
  ];

  const bestCustomer = getBestCustomer(analytics);
  if (bestCustomer) {
    sections.push({
      label: "Best customer",
      value: `${bestCustomer.name} — ${formatCurrency(bestCustomer.revenue)}`,
    });
  }

  const bestJob = getMostProfitableJob(analytics);
  if (bestJob) {
    sections.push({
      label: "Most profitable job",
      value: `${bestJob.name} — ${formatPercent(bestJob.marginPercent)} margin`,
    });
  }

  return sections;
}

function answerYearToDateReview(analytics: AnalyticsData): string {
  return formatScannableAnswer(
    `${periodLabel(analytics.filters.dateRange)} business review`,
    buildBusinessReviewSections(analytics),
    buildBusinessReviewFooter(analytics)
  );
}

function answerBusinessSummaryQuestion(analytics: AnalyticsData): string {
  const forecasts = buildForecastViewModel(analytics);
  const footer = buildBusinessReviewFooter(analytics);

  if (forecasts.revenue.itemCount > 0) {
    footer.unshift(
      `Next 30 days: ${formatCurrency(forecasts.revenue.expectedRevenue)} expected from ${forecasts.revenue.itemCount} weighted pipeline item(s).`
    );
  }

  return formatScannableAnswer(
    `${periodLabel(analytics.filters.dateRange)} business review`,
    buildBusinessReviewSections(analytics),
    footer
  );
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
    return formatScannableAnswer("Profit review", [
      {
        label: "Gross profit",
        value: `${formatCurrency(analytics.executive.grossProfit)} (${formatPercent(analytics.executive.grossMarginPercent)} margin)`,
      },
      "Profit looks stable in this period. Check project actuals if a specific job feels tight.",
    ]);
  }

  return formatScannableAnswer("What's pulling profit down", [
    ...reasons.map((reason, index) => `${index + 1}. ${reason}`),
    "Start with low-margin estimates and jobs with cost overruns.",
  ]);
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
    return formatScannableAnswer("Margin review", [
      {
        label: "Gross margin",
        value: formatPercent(margin),
      },
      "Margins look healthy across the portfolio. Review individual estimates if a specific job feels tight.",
    ]);
  }

  return formatScannableAnswer("What's keeping margins low", [
    ...reasons.map((reason, index) => `${index + 1}. ${reason}`),
    "Review markup on the weakest estimates and jobs with cost overruns first.",
  ]);
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

  return formatScannableAnswer(`${periodLabel(analytics.filters.dateRange)} pipeline review`, [
    { label: "Pipeline value", value: formatCurrency(analytics.executive.pipelineValue) },
    {
      label: "Expected revenue (30d)",
      value: `${formatCurrency(forecasts.revenue.expectedRevenue)} across ${forecasts.revenue.itemCount} weighted item(s)`,
    },
    stageSummary ? { label: "Active stages", value: stageSummary } : "No active pipeline stages yet.",
    analytics.aiOpportunities.staleProposals.length > 0
      ? {
          label: "Follow-up",
          value: `${analytics.aiOpportunities.staleProposals.length} sent proposal(s) may need attention`,
        }
      : "Keep moving qualified leads into estimating.",
  ]);
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

  return formatScannableAnswer("Top customers by revenue", [
    {
      label: "Leader",
      value: `${leader.companyName} (${formatCurrency(leader.revenue)})`,
    },
    ...lines,
  ]);
}

function answerRevenuePredictionQuestion(analytics: AnalyticsData) {
  const forecasts = buildForecastViewModel(analytics);
  const trend = forecasts.revenueTrend;

  return formatScannableAnswer("Revenue forecast", [
    {
      label: "Next 30 days",
      value: `${formatCurrency(forecasts.revenue.expectedRevenue)} expected revenue · ${formatCurrency(forecasts.profit.expectedGrossProfit)} gross profit`,
    },
    trend
      ? {
          label: "Trend",
          value: `${trend.direction === "up" ? "Up" : trend.direction === "down" ? "Down" : "Flat"} ${Math.abs(trend.changePercent).toFixed(1)}% vs earlier in the period`,
        }
      : "Add pipeline activity to sharpen the forecast.",
    {
      label: "Pipeline inputs",
      value: `${forecasts.revenue.itemCount} weighted item(s) at ${formatPercent(forecasts.revenue.historicalWinRate)} historical win rate`,
    },
  ]);
}

export function answerVoltAiFromRules(question: string, analytics: AnalyticsData) {
  const normalized = normalizeVoltAiQuestion(question);
  const intent = detectVoltAiQuestionIntent(question);

  if (intent.intent === "year_review") {
    return answerYearToDateReview(analytics);
  }

  if (normalized.includes("analyze") && normalized.includes("margin")) {
    return answerMarginsLowQuestion(analytics);
  }

  if (normalized.includes("profitable") && normalized.includes("customer")) {
    return answerMostProfitableCustomerQuestion(analytics);
  }

  if (
    normalized.includes("jobs at risk") ||
    normalized.includes("at risk") ||
    (normalized.includes("risk") && !normalized.includes("focus"))
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

    return formatScannableAnswer("Most profitable recent estimates", [
      ...estimates.map(
        (estimate, index) =>
          `${index + 1}. ${estimate.title} (${estimate.customerName}) — ${formatPercent(estimate.profitMarginPercent)} margin, ${formatCurrency(estimate.grandTotal)} total`
      ),
    ]);
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
      return formatScannableAnswer("Profit momentum", [
        {
          label: "Trend",
          value: `Gross profit is up ${profitTrend.changePercent.toFixed(0)}% compared with earlier in the period`,
        },
        "Keep closing high-margin work and maintain follow-through on sent proposals.",
      ]);
    }

    return formatScannableAnswer("Profit improvement", [
      {
        label: "Gross margin",
        value: formatPercent(analytics.executive.grossMarginPercent),
      },
      "Raise markup on low-margin estimates and convert awarded work to protect profit growth.",
    ]);
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

    return formatScannableAnswer("Lowest-margin jobs", [
      ...projects.map(
        (project, index) =>
          `${index + 1}. ${project.projectName} (${project.customerName}) — ${formatPercent(project.marginPercent)} margin, ${formatCurrency(project.revenue)} revenue`
      ),
    ]);
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

    return formatScannableAnswer("Win rate review", [
      {
        label: "Win rate",
        value: `${formatPercent(analytics.executive.winRate)} across ${analytics.proposals.totalDecided} decided proposals`,
      },
      followUps > 0
        ? {
            label: "Follow-up",
            value: `${followUps} open proposal(s) need attention — start with the oldest sent proposals`,
          }
        : "Keep response times tight on sent proposals and confirm scope clarity before pricing.",
      analytics.executive.grossMarginPercent < 15
        ? "Thin margins can hurt close rates — review markup on low-margin estimates before rebidding."
        : "Focus on project types and customers that already drive accepted work.",
    ]);
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
    return formatScannableAnswer("Estimator AI usage", [
      {
        label: "Leader",
        value: `${leader.displayName} — ${leader.estimatesAssisted} AI-assisted estimate(s), ${leader.sessionCount} session(s)`,
      },
      ranked.length > 1
        ? `${ranked[1].displayName} is next with ${ranked[1].estimatesAssisted} assisted estimate(s).`
        : "",
      `Portfolio estimate accuracy is ${formatPercent(analytics.estimating.estimateAccuracyPercent)}.`,
    ].filter(Boolean));
  }

  if (intent.intent === "business_summary") {
    return answerBusinessSummaryQuestion(analytics);
  }

  return answerBusinessSummaryQuestion(analytics);
}
