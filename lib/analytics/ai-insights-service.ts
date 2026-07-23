import { compareRevenueTrend } from "@/lib/analytics/forecast-service";
import type { AiOpportunitiesInput, AnalyticsData } from "@/lib/analytics/types";

export type AiInsightsSource = "rules" | "openai";

export type BusinessCoachInsightSeverity = "info" | "warning" | "success";

export type BusinessCoachInsightCategory =
  | "low_margin_estimates"
  | "proposal_follow_up"
  | "revenue_trend"
  | "project_review"
  | "high_labor_cost"
  | "pipeline_health";

export type BusinessCoachInsight = {
  id: string;
  category: BusinessCoachInsightCategory;
  severity: BusinessCoachInsightSeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
  href?: string;
};

export type BusinessCoachInsightsResult = {
  insights: BusinessCoachInsight[];
  generatedAt: string;
  source: AiInsightsSource;
  summary: string;
};

export type AiOpportunitySeverity = "high" | "medium" | "low";

export type AiOpportunityCategory =
  | "markup"
  | "proposal_follow_up"
  | "margin_review"
  | "customer_engagement"
  | "labor_cost"
  | "material_cost";

export type AiOpportunity = {
  id: string;
  category: AiOpportunityCategory;
  severity: AiOpportunitySeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
  impactLabel: string;
  href?: string;
};

export type AiOpportunitiesResult = {
  opportunities: AiOpportunity[];
  generatedAt: string;
  source: AiInsightsSource;
  headline: string;
  subheadline: string;
  priorityCount: number;
};

export type AiInsightsViewModel = {
  businessCoach: BusinessCoachInsightsResult;
  opportunities: AiOpportunitiesResult;
  generatedAt: string;
  source: AiInsightsSource;
};

const LOW_MARGIN_THRESHOLD = 15;
const CRITICAL_MARGIN_THRESHOLD = 8;
const HIGH_LABOR_UTILIZATION_THRESHOLD = 55;
const FOLLOW_UP_DAYS_THRESHOLD = 7;
const MARKUP_INCREASE_PERCENT = 2;
const PROPOSAL_FOLLOW_UP_DAYS = 5;
const CUSTOMER_PROPOSAL_STALE_DAYS = 30;

const coachSeverityRank: Record<BusinessCoachInsightSeverity, number> = {
  warning: 0,
  info: 1,
  success: 2,
};

const opportunitySeverityRank: Record<AiOpportunitySeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function pushCoachInsight(
  insights: BusinessCoachInsight[],
  insight: BusinessCoachInsight
) {
  if (insights.some((item) => item.id === insight.id)) {
    return;
  }

  insights.push(insight);
}

function pushOpportunity(
  opportunities: AiOpportunity[],
  opportunity: AiOpportunity
) {
  if (opportunities.some((item) => item.id === opportunity.id)) {
    return;
  }

  opportunities.push(opportunity);
}

function buildLowMarginInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  const lowMarginEstimates = data.recentEstimates.filter(
    (estimate) =>
      estimate.profitMarginPercent > 0 &&
      estimate.profitMarginPercent < LOW_MARGIN_THRESHOLD
  );

  if (lowMarginEstimates.length === 0) {
    if (
      data.executive.grossMarginPercent > 0 &&
      data.executive.grossMarginPercent < LOW_MARGIN_THRESHOLD
    ) {
      pushCoachInsight(insights, {
        id: "portfolio-low-margin",
        category: "low_margin_estimates",
        severity: "warning",
        title: "Portfolio gross margin is below target",
        explanation: `Average gross margin is ${data.executive.grossMarginPercent.toFixed(1)}% across accepted work in this period.`,
        recommendedAction:
          "Review markup, overhead, and contingency on open estimates before sending proposals.",
        href: "/estimates",
      });
    }
    return;
  }

  const worst = [...lowMarginEstimates].sort(
    (a, b) => a.profitMarginPercent - b.profitMarginPercent
  )[0];

  pushCoachInsight(insights, {
    id: `low-margin-${worst.id}`,
    category: "low_margin_estimates",
    severity:
      worst.profitMarginPercent < CRITICAL_MARGIN_THRESHOLD ? "warning" : "info",
    title: `Low margin on "${worst.title}"`,
    explanation: `${worst.profitMarginPercent.toFixed(1)}% margin on ${worst.projectName} — ${lowMarginEstimates.length} estimate(s) are below ${LOW_MARGIN_THRESHOLD}%.`,
    recommendedAction:
      "Adjust profit margin or reduce direct costs before marking the estimate final.",
    href: `/estimates/${worst.id}`,
  });
}

function buildProposalFollowUpInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  const pendingFollowUp = data.recentActivity.filter(
    (item) =>
      item.type === "proposal" &&
      (item.action === "Proposal sent" ||
        item.subtitle.toLowerCase().includes("sent"))
  );

  const openPipeline =
    data.proposals.totalSent - data.proposals.totalDecided > 0
      ? data.proposals.totalSent - data.proposals.totalDecided
      : 0;

  if (pendingFollowUp.length > 0 || openPipeline > 0) {
    pushCoachInsight(insights, {
      id: "proposals-follow-up",
      category: "proposal_follow_up",
      severity: openPipeline >= 3 ? "warning" : "info",
      title: "Proposals need follow-up",
      explanation:
        openPipeline > 0
          ? `${openPipeline} sent proposal(s) are still awaiting a customer decision.`
          : `${pendingFollowUp.length} recent proposal(s) were sent and may need a check-in.`,
      recommendedAction:
        "Call or email customers on sent proposals and confirm they received the portal link.",
      href: "/proposals?status=Sent",
    });
  }

  if (data.executive.averageProposalAcceptanceDays > FOLLOW_UP_DAYS_THRESHOLD) {
    pushCoachInsight(insights, {
      id: "slow-proposal-cycle",
      category: "proposal_follow_up",
      severity: "info",
      title: "Proposal decisions are taking longer than usual",
      explanation: `Average time from sent to accepted is ${data.executive.averageProposalAcceptanceDays.toFixed(1)} days in this period.`,
      recommendedAction:
        "Schedule follow-ups 3–5 days after sending and confirm expiration dates are set.",
      href: "/proposals",
    });
  }
}

function buildRevenueTrendInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  const trend = compareRevenueTrend(data.charts.revenueTrend);

  if (!trend) {
    if (data.executive.revenue === 0) {
      pushCoachInsight(insights, {
        id: "revenue-empty",
        category: "revenue_trend",
        severity: "info",
        title: "No accepted revenue in this period",
        explanation:
          "Revenue is driven by accepted proposals. Pipeline activity may still be building.",
        recommendedAction:
          "Focus on converting sent proposals and finalizing estimates ready for proposal generation.",
        href: "/proposals",
      });
    }
    return;
  }

  if (trend.direction === "down") {
    pushCoachInsight(insights, {
      id: "revenue-trend-down",
      category: "revenue_trend",
      severity: "warning",
      title: "Revenue trend is declining",
      explanation: `Recent period revenue is down ${Math.abs(trend.changePercent).toFixed(0)}% compared with earlier in the selected range.`,
      recommendedAction:
        "Prioritize high-value proposals in the pipeline and review win/loss patterns with your team.",
      href: "/analytics?section=charts",
    });
    return;
  }

  if (trend.direction === "up") {
    pushCoachInsight(insights, {
      id: "revenue-trend-up",
      category: "revenue_trend",
      severity: "success",
      title: "Revenue trend is improving",
      explanation: `Recent period revenue is up ${trend.changePercent.toFixed(0)}% compared with earlier in the selected range.`,
      recommendedAction:
        "Maintain momentum by fast-tracking estimates for active bidding projects.",
      href: "/analytics?section=charts",
    });
  }
}

function buildProjectReviewInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  const weakProjects = data.estimating.marginByProject.filter(
    (project) =>
      project.marginPercent > 0 && project.marginPercent < LOW_MARGIN_THRESHOLD
  );

  if (weakProjects.length > 0) {
    const target = weakProjects[0];
    pushCoachInsight(insights, {
      id: `project-review-${target.projectId}`,
      category: "project_review",
      severity: "warning",
      title: `"${target.projectName}" needs a margin review`,
      explanation: `${target.marginPercent.toFixed(1)}% margin with ${target.customerName} — ${weakProjects.length} project(s) are below target.`,
      recommendedAction:
        "Review estimate assumptions, change orders, and job actuals for this project.",
      href: `/projects/${target.projectId}`,
    });
  }

  if (data.estimating.costOverrunCount > 0) {
    pushCoachInsight(insights, {
      id: "cost-overruns",
      category: "project_review",
      severity: "warning",
      title: "Cost overruns detected on active jobs",
      explanation: `${data.estimating.costOverrunCount} project(s) have actual costs exceeding the estimated total.`,
      recommendedAction:
        "Update job actuals, document change orders, and rebid similar scope on future estimates.",
      href: "/analytics?section=projects",
    });
  }

  const estimatingProjects = data.projects.projectsByStatus.find(
    (stage) => stage.status === "Estimating"
  );

  if (estimatingProjects && estimatingProjects.count >= 4) {
    pushCoachInsight(insights, {
      id: "estimating-backlog",
      category: "project_review",
      severity: "info",
      title: "Estimating backlog is building",
      explanation: `${estimatingProjects.count} projects are in Estimating with ${estimatingProjects.value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} in pipeline value.`,
      recommendedAction:
        "Assign estimators to the highest-value bids first and finalize drafts nearing bid dates.",
      href: "/projects?status=Estimating",
    });
  }
}

function buildHighLaborInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  if (
    data.estimating.laborUtilizationPercent >= HIGH_LABOR_UTILIZATION_THRESHOLD
  ) {
    pushCoachInsight(insights, {
      id: "high-labor-utilization",
      category: "high_labor_cost",
      severity: "warning",
      title: "Labor share of estimate cost is elevated",
      explanation: `Labor represents ${data.estimating.laborUtilizationPercent.toFixed(1)}% of direct cost in this period — above the ${HIGH_LABOR_UTILIZATION_THRESHOLD}% watch threshold.`,
      recommendedAction:
        "Validate crew sizing, labor rates, and prefab/material alternatives on open estimates.",
      href: "/analytics?section=estimating",
    });
  }

  if (data.estimating.costVariancePercent > 10) {
    pushCoachInsight(insights, {
      id: "estimate-actual-variance",
      category: "high_labor_cost",
      severity: "info",
      title: "Estimate vs. actual variance is widening",
      explanation: `Actual job costs are ${data.estimating.costVariancePercent.toFixed(1)}% above estimated totals on tracked projects.`,
      recommendedAction:
        "Compare labor hours on completed jobs and feed lessons into your estimating templates.",
      href: "/analytics?section=estimating",
    });
  }
}

function buildPipelineInsights(
  data: AnalyticsData,
  insights: BusinessCoachInsight[]
) {
  const pipeline = data.charts.projectPipeline;
  const leadCount = pipeline.find((stage) => stage.status === "Lead")?.count ?? 0;
  const awardedCount =
    pipeline.find((stage) => stage.status === "Awarded")?.count ?? 0;
  const proposalSentCount =
    pipeline.find((stage) => stage.status === "Proposal Sent")?.count ?? 0;

  if (data.executive.winRate >= 45 && data.proposals.totalDecided >= 3) {
    pushCoachInsight(insights, {
      id: "pipeline-win-rate-strong",
      category: "pipeline_health",
      severity: "success",
      title: "Win rate is healthy",
      explanation: `${data.executive.winRate.toFixed(1)}% win rate on ${data.proposals.totalDecided} decided proposals with ${data.executive.pipelineValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} in active pipeline.`,
      recommendedAction:
        "Double down on profitable project types and customers driving accepted work.",
      href: "/analytics?section=proposals",
    });
  } else if (data.proposals.totalDecided >= 3 && data.executive.winRate < 30) {
    pushCoachInsight(insights, {
      id: "pipeline-win-rate-weak",
      category: "pipeline_health",
      severity: "warning",
      title: "Win rate is below target",
      explanation: `${data.executive.winRate.toFixed(1)}% win rate suggests proposals may need sharper pricing or qualification.`,
      recommendedAction:
        "Review declined proposals for pricing patterns and tighten go/no-go criteria on new bids.",
      href: "/analytics?section=proposals",
    });
  }

  if (leadCount > awardedCount + proposalSentCount && leadCount >= 5) {
    pushCoachInsight(insights, {
      id: "pipeline-top-heavy",
      category: "pipeline_health",
      severity: "info",
      title: "Pipeline is top-heavy with early-stage leads",
      explanation: `${leadCount} projects are still in Lead compared with ${proposalSentCount} in Proposal Sent and ${awardedCount} Awarded.`,
      recommendedAction:
        "Move qualified leads into estimating and set bid dates to avoid stale pipeline.",
      href: "/projects?status=Lead",
    });
  }

  if (data.executive.pipelineValue > 0 && data.executive.activeProjects === 0) {
    pushCoachInsight(insights, {
      id: "pipeline-value-no-active",
      category: "pipeline_health",
      severity: "info",
      title: "Pipeline value exists but no active projects",
      explanation: `You have ${data.executive.pipelineValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} in pipeline value with zero active projects.`,
      recommendedAction:
        "Convert awarded work into active projects and confirm project statuses are up to date.",
      href: "/projects",
    });
  }
}

function buildCoachSummary(insights: BusinessCoachInsight[]) {
  const warnings = insights.filter((item) => item.severity === "warning").length;
  const successes = insights.filter((item) => item.severity === "success").length;

  if (insights.length === 0) {
    return "No immediate actions detected. Keep monitoring estimates, proposals, and pipeline activity.";
  }

  if (warnings > 0) {
    return `${warnings} priority item(s) need attention. Review recommendations below to protect margin and close more work.`;
  }

  if (successes > 0) {
    return "Business metrics look healthy overall. Review opportunities below to maintain momentum.";
  }

  return "Operational insights are available below based on your current analytics filters.";
}

export function generateBusinessCoachInsights(
  data: AnalyticsData,
  source: AiInsightsSource = "rules"
): BusinessCoachInsightsResult {
  const insights: BusinessCoachInsight[] = [];

  buildLowMarginInsights(data, insights);
  buildProposalFollowUpInsights(data, insights);
  buildRevenueTrendInsights(data, insights);
  buildProjectReviewInsights(data, insights);
  buildHighLaborInsights(data, insights);
  buildPipelineInsights(data, insights);

  const sorted = insights.sort(
    (a, b) => coachSeverityRank[a.severity] - coachSeverityRank[b.severity]
  );

  return {
    insights: sorted.slice(0, 8),
    generatedAt: data.generatedAt,
    source,
    summary: buildCoachSummary(sorted),
  };
}

function buildMarkupOpportunity(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  if (
    input.portfolioGrossMarginPercent <= 0 ||
    input.portfolioGrossMarginPercent >= input.targetMarginPercent
  ) {
    return;
  }

  const gap = input.targetMarginPercent - input.portfolioGrossMarginPercent;

  pushOpportunity(opportunities, {
    id: "increase-markup",
    category: "markup",
    severity: gap >= 5 ? "high" : "medium",
    title: `Increase markup by ${MARKUP_INCREASE_PERCENT}%`,
    explanation: `Portfolio gross margin is ${input.portfolioGrossMarginPercent.toFixed(1)}% — ${gap.toFixed(1)} points below your ${input.targetMarginPercent}% target.`,
    recommendedAction:
      "Raise profit margin on open estimates and re-check overhead before the next proposal goes out.",
    impactLabel: "Margin recovery",
    href: "/estimates",
  });
}

function buildProposalFollowUpOpportunities(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  const stale = input.staleProposals.filter(
    (proposal) => proposal.daysSinceSent >= PROPOSAL_FOLLOW_UP_DAYS
  );

  if (stale.length === 0) {
    return;
  }

  const oldest = stale.sort((a, b) => b.daysSinceSent - a.daysSinceSent)[0];

  pushOpportunity(opportunities, {
    id: "proposal-follow-up-stale",
    category: "proposal_follow_up",
    severity: stale.length >= 3 ? "high" : "medium",
    title: "Follow up on aging proposals",
    explanation: `${stale.length} open proposal(s) have been out for more than ${PROPOSAL_FOLLOW_UP_DAYS} days. Oldest: "${oldest.title}" (${oldest.daysSinceSent} days).`,
    recommendedAction:
      "Call the customer, confirm they received the portal link, and reset expiration if needed.",
    impactLabel: "Close rate",
    href: "/proposals?status=Sent",
  });
}

function buildMarginReviewOpportunities(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  const lowMargin = input.lowMarginEstimates.filter(
    (estimate) =>
      estimate.marginPercent > 0 &&
      estimate.marginPercent < input.targetMarginPercent
  );

  if (lowMargin.length === 0) {
    return;
  }

  const worst = [...lowMargin].sort(
    (a, b) => a.marginPercent - b.marginPercent
  )[0];

  pushOpportunity(opportunities, {
    id: `margin-review-${worst.id}`,
    category: "margin_review",
    severity: worst.marginPercent < 8 ? "high" : "medium",
    title: "Review estimates below target margin",
    explanation: `${lowMargin.length} estimate(s) are under ${input.targetMarginPercent}% margin. Lowest: "${worst.title}" at ${worst.marginPercent.toFixed(1)}%.`,
    recommendedAction:
      "Adjust markup, labor rates, or scope assumptions before marking estimates final.",
    impactLabel: "Profit protection",
    href: `/estimates/${worst.id}`,
  });
}

function buildCustomerEngagementOpportunities(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  const staleCustomers = input.customersWithoutRecentProposal.filter(
    (customer) =>
      customer.daysSinceLastProposal === null ||
      customer.daysSinceLastProposal >= CUSTOMER_PROPOSAL_STALE_DAYS
  );

  if (staleCustomers.length === 0) {
    return;
  }

  const target = staleCustomers[0];

  pushOpportunity(opportunities, {
    id: `customer-proposal-gap-${target.customerId}`,
    category: "customer_engagement",
    severity: staleCustomers.length >= 3 ? "high" : "medium",
    title: "Customers missing recent proposals",
    explanation:
      target.daysSinceLastProposal === null
        ? `${staleCustomers.length} active customer(s), including ${target.companyName}, have projects but no proposal on record.`
        : `${staleCustomers.length} customer(s) haven't received a proposal in ${CUSTOMER_PROPOSAL_STALE_DAYS}+ days. Next up: ${target.companyName}.`,
    recommendedAction:
      "Convert ready estimates into proposals and schedule customer outreach this week.",
    impactLabel: "Pipeline growth",
    href: `/analytics?section=customers&customer=${target.customerId}`,
  });
}

function buildHighLaborOpportunities(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  if (input.highLaborProjects.length === 0) {
    return;
  }

  const target = input.highLaborProjects[0];

  pushOpportunity(opportunities, {
    id: `high-labor-${target.projectId}`,
    category: "labor_cost",
    severity: target.laborPercent >= 65 ? "high" : "medium",
    title: "Projects with unusually high labor costs",
    explanation: `"${target.projectName}" is at ${target.laborPercent.toFixed(1)}% labor vs ${input.portfolioLaborPercent.toFixed(1)}% portfolio average — ${input.highLaborProjects.length} project(s) flagged.`,
    recommendedAction:
      "Validate crew sizing, prefab options, and labor rates before bid submission.",
    impactLabel: "Cost control",
    href: `/projects/${target.projectId}`,
  });
}

function buildLowMaterialOpportunities(
  input: AiOpportunitiesInput,
  opportunities: AiOpportunity[]
) {
  if (input.lowMaterialProjects.length === 0) {
    return;
  }

  const target = input.lowMaterialProjects[0];

  pushOpportunity(opportunities, {
    id: `low-material-${target.projectId}`,
    category: "material_cost",
    severity: target.materialPercent <= 8 ? "high" : "medium",
    title: "Projects with unusually low material costs",
    explanation: `"${target.projectName}" shows ${target.materialPercent.toFixed(1)}% materials vs ${input.portfolioMaterialPercent.toFixed(1)}% portfolio average — ${input.lowMaterialProjects.length} project(s) may be under-scoped.`,
    recommendedAction:
      "Review material takeoffs and allowances to avoid margin erosion during execution.",
    impactLabel: "Scope accuracy",
    href: `/projects/${target.projectId}`,
  });
}

function buildOpportunityHeadline(opportunities: AiOpportunity[]) {
  const highPriority = opportunities.filter(
    (opportunity) => opportunity.severity === "high"
  ).length;

  if (highPriority > 0) {
    return `${highPriority} high-priority action${highPriority === 1 ? "" : "s"} to protect margin and close work.`;
  }

  if (opportunities.length > 0) {
    return "Focused opportunities to strengthen margin, pipeline, and estimate quality.";
  }

  return "Operations look steady — keep monitoring margin, proposals, and customer follow-through.";
}

export function generateAiOpportunities(
  input: AiOpportunitiesInput,
  generatedAt: string,
  source: AiInsightsSource = "rules"
): AiOpportunitiesResult {
  const opportunities: AiOpportunity[] = [];

  buildMarkupOpportunity(input, opportunities);
  buildProposalFollowUpOpportunities(input, opportunities);
  buildMarginReviewOpportunities(input, opportunities);
  buildCustomerEngagementOpportunities(input, opportunities);
  buildHighLaborOpportunities(input, opportunities);
  buildLowMaterialOpportunities(input, opportunities);

  const sorted = opportunities.sort(
    (a, b) => opportunitySeverityRank[a.severity] - opportunitySeverityRank[b.severity]
  );

  const priorityCount = sorted.filter(
    (opportunity) => opportunity.severity === "high"
  ).length;

  return {
    opportunities: sorted,
    generatedAt,
    source,
    headline: buildOpportunityHeadline(sorted),
    subheadline:
      "Executive recommendations based on your live pipeline, margins, and customer activity.",
    priorityCount,
  };
}

export function buildAiInsightsViewModel(
  data: AnalyticsData,
  source: AiInsightsSource = "rules"
): AiInsightsViewModel {
  return {
    businessCoach: generateBusinessCoachInsights(data, source),
    opportunities: generateAiOpportunities(
      data.aiOpportunities,
      data.generatedAt,
      source
    ),
    generatedAt: data.generatedAt,
    source,
  };
}

export async function generateBusinessCoachInsightsAsync(
  data: AnalyticsData
): Promise<BusinessCoachInsightsResult> {
  return generateBusinessCoachInsights(data, "openai");
}

export async function generateAiOpportunitiesAsync(
  input: AiOpportunitiesInput,
  generatedAt: string
): Promise<AiOpportunitiesResult> {
  return generateAiOpportunities(input, generatedAt, "openai");
}

export async function buildAiInsightsViewModelAsync(
  data: AnalyticsData
): Promise<AiInsightsViewModel> {
  return buildAiInsightsViewModel(data, "openai");
}

/** @deprecated Use generateBusinessCoachInsights */
export type BusinessCoachInsightsSource = AiInsightsSource;

/** @deprecated Use AiOpportunitiesResult */
export type AiOpportunitiesSource = AiInsightsSource;
