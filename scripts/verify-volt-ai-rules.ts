#!/usr/bin/env node

import {
  answerVoltAiFromRules,
  detectVoltAiQuestionIntent,
  resolveVoltAiAnalyticsFilters,
} from "../lib/ai/volt-ai-rules";
import type { AnalyticsData } from "../lib/analytics/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const mockAnalytics = {
  filters: { dateRange: "ytd", customerId: "", projectId: "", projectStatus: "" },
  generatedAt: new Date().toISOString(),
  executive: {
    revenue: 125000,
    grossProfit: 31250,
    grossMarginPercent: 25,
    totalEstimates: 8,
    totalProposals: 5,
    winRate: 42,
    activeProjects: 3,
    pipelineValue: 98000,
    averageEstimateSize: 0,
    averageProjectMargin: 0,
    averageEstimateProductionHours: 0,
    averageProposalAcceptanceDays: 0,
  },
  estimating: {
    estimateAccuracyPercent: 88,
    estimatedTotal: 0,
    actualTotal: 0,
    costVariancePercent: 0,
    laborUtilizationPercent: 0,
    materialCostTrend: [],
    equipmentCostTrend: [],
    changeOrderCount: 0,
    costOverrunCount: 1,
    marginByProject: [
      {
        projectId: "p1",
        projectName: "Panel Upgrade — Main St",
        customerName: "Apex Electric",
        marginPercent: 31,
        revenue: 42000,
      },
    ],
  },
  proposals: {
    acceptanceRate: 0,
    declineRate: 0,
    averageSalesCycleDays: 0,
    averageProposalValue: 0,
    revenueWon: 0,
    revenueLost: 0,
    totalSent: 0,
    totalDecided: 4,
    proposalVolumeTrend: [],
  },
  customers: {
    topCustomers: [
      {
        customerId: "c1",
        companyName: "Apex Electric",
        revenue: 76000,
        projectCount: 2,
        estimateCount: 3,
      },
    ],
    revenueByCustomer: [],
    repeatCustomerRate: 0,
    averageCustomerValue: 0,
    customerLifetimeValue: 0,
    customerGrowthTrend: [],
  },
  projects: {
    projectsByStatus: [],
    revenueByProject: [],
    profitabilityByProject: [],
    largestProjects: [],
    mostProfitableProjects: [
      {
        projectId: "p1",
        projectName: "Panel Upgrade — Main St",
        customerName: "Apex Electric",
        marginPercent: 31,
        profit: 13000,
      },
    ],
  },
  ai: {
    aiGeneratedEstimates: 0,
    aiAdoptionRate: 0,
    estimatedTimeSavedHours: 0,
    recommendationAcceptanceRate: 0,
    averageEstimateCompletionHours: 0,
    usageByEstimator: [],
  },
  charts: {
    revenueTrend: [],
    profitTrend: [],
    winRateTrend: [],
    estimateVolumeTrend: [],
    proposalVolumeTrend: [],
    projectPipeline: [],
    customerGrowthTrend: [],
    monthlyRecurringRevenue: 0,
    mrrTrend: [],
  },
  recentEstimates: [],
  recentActivity: [],
  revenueForecast: {
    pipelineItems: [],
    historicalWinRate: 0,
    targetMarginPercent: 15,
    portfolioMarginPercent: 25,
  },
  proposalIntelligence: {
    dateRange: "ytd",
    proposals: [],
    followUpDaysThreshold: 7,
  },
  estimateIntelligence: { estimates: [], lineItems: [] },
  customerIntelligence: { customers: [], activeCustomerCount: 0 },
  aiOpportunities: {
    targetMarginPercent: 15,
    portfolioGrossMarginPercent: 25,
    portfolioLaborPercent: 0,
    portfolioMaterialPercent: 0,
    staleProposals: [
      {
        id: "prop-1",
        title: "Commercial TI Bid",
        projectName: "Office Buildout",
        customerName: "Summit Properties",
        daysSinceSent: 9,
      },
    ],
    lowMarginEstimates: [],
    customersWithoutRecentProposal: [],
    highLaborProjects: [],
    lowMaterialProjects: [],
  },
} as AnalyticsData;

const yearIntent = detectVoltAiQuestionIntent("my year");
assert(yearIntent.intent === "year_review", "my year should map to year review");
assert(yearIntent.preferredDateRange === "ytd", "my year should prefer YTD analytics");

const yearFilters = resolveVoltAiAnalyticsFilters("my year");
assert(yearFilters.dateRange === "ytd", "my year should resolve YTD filters");

const yearAnswer = answerVoltAiFromRules("my year", mockAnalytics);
assert(yearAnswer.includes("Year-to-date business review"), "year answer should be titled");
assert(yearAnswer.includes("Year-to-date revenue:"), "year answer should include revenue label");
assert(yearAnswer.includes("Gross profit / margin:"), "year answer should include profit label");
assert(yearAnswer.includes("Estimates, proposals, and jobs:"), "year answer should include activity label");
assert(yearAnswer.includes("Win rate:"), "year answer should include win rate");
assert(yearAnswer.includes("Best customer:"), "year answer should include best customer");
assert(yearAnswer.includes("Most profitable job:"), "year answer should include most profitable job");
assert(yearAnswer.includes("What to focus on next:"), "year answer should include focus recommendation");
assert(!yearAnswer.includes("Try asking"), "year answer should not use generic prompt text");
assert(!yearAnswer.includes("$0"), "year answer should not show invented zero-dollar metrics");

const emptyAnalytics = {
  ...mockAnalytics,
  executive: {
    ...mockAnalytics.executive,
    revenue: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalEstimates: 0,
    totalProposals: 0,
    winRate: 0,
    activeProjects: 0,
    pipelineValue: 0,
  },
  proposals: { ...mockAnalytics.proposals, totalDecided: 0 },
  customers: { ...mockAnalytics.customers, topCustomers: [] },
  projects: { ...mockAnalytics.projects, mostProfitableProjects: [] },
  estimating: { ...mockAnalytics.estimating, marginByProject: [], costOverrunCount: 0 },
  aiOpportunities: {
    ...mockAnalytics.aiOpportunities,
    staleProposals: [],
    lowMarginEstimates: [],
  },
} as AnalyticsData;

const emptyAnswer = answerVoltAiFromRules("my year", emptyAnalytics);
assert(emptyAnswer.includes("No data yet"), "empty portfolio should show No data yet");
assert(!emptyAnswer.includes("Best customer:"), "empty portfolio should omit best customer");
assert(!emptyAnswer.includes("Most profitable job:"), "empty portfolio should omit best job");
assert(emptyAnswer.includes("What to focus on next:"), "empty portfolio should still guide next steps");

const vagueAnswer = answerVoltAiFromRules("how are we doing", mockAnalytics);
assert(vagueAnswer.includes("business review"), "vague question should return business review");
assert(vagueAnswer.includes("Apex Electric"), "vague answer should use live customer data");

const unknownAnswer = answerVoltAiFromRules("hello there", mockAnalytics);
assert(unknownAnswer.includes("business review"), "unknown vague question should fall back to business review");

const marginAnswer = answerVoltAiFromRules("analyze my margins", mockAnalytics);
assert(marginAnswer.includes("Margin review") || marginAnswer.includes("margins"), "specific margin question should stay targeted");

console.log("volt-ai rules verification passed");
