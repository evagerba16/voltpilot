import {
  generateCustomerIntelligence,
  type CustomerIntelligenceResult,
} from "@/lib/analytics/internal/customer-intelligence";
import {
  generateEstimateIntelligence,
  type EstimateIntelligenceResult,
} from "@/lib/analytics/internal/estimate-intelligence";
import {
  generateProposalIntelligence,
  type ProposalIntelligenceResult,
} from "@/lib/analytics/internal/proposal-intelligence";
import type { AnalyticsData } from "@/lib/analytics/types";

export type {
  CustomerIntelligenceResult,
  CustomerRevenueRank,
  FastestPayingCustomer,
} from "@/lib/analytics/internal/customer-intelligence";
export type {
  EstimateIntelligenceResult,
  RankedEstimateMetric,
} from "@/lib/analytics/internal/estimate-intelligence";
export type {
  ProposalAcceptanceRatePoint,
  ProposalFollowUpItem,
  ProposalIntelligenceResult,
} from "@/lib/analytics/internal/proposal-intelligence";

export {
  generateCustomerIntelligence,
  generateCustomerIntelligenceAsync,
} from "@/lib/analytics/internal/customer-intelligence";
export {
  formatEstimateCreationTime,
  generateEstimateIntelligence,
  generateEstimateIntelligenceAsync,
} from "@/lib/analytics/internal/estimate-intelligence";
export {
  generateProposalIntelligence,
  generateProposalIntelligenceAsync,
} from "@/lib/analytics/internal/proposal-intelligence";

export type AnalyticsKpiSnapshot = {
  revenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  winRate: number;
  pipelineValue: number;
  activeProjects: number;
  totalEstimates: number;
  totalProposals: number;
  averageEstimateSize: number;
  averageProjectMargin: number;
  acceptanceRate: number;
  declineRate: number;
  laborUtilizationPercent: number;
  costVariancePercent: number;
  repeatCustomerRate: number;
  pipelineStages: AnalyticsData["charts"]["projectPipeline"];
};

export type AnalyticsViewModel = {
  kpis: AnalyticsKpiSnapshot;
  proposalIntelligence: ProposalIntelligenceResult;
  estimateIntelligence: EstimateIntelligenceResult;
  customerIntelligence: CustomerIntelligenceResult;
  generatedAt: string;
};

export function buildAnalyticsKpiSnapshot(data: AnalyticsData): AnalyticsKpiSnapshot {
  return {
    revenue: data.executive.revenue,
    grossProfit: data.executive.grossProfit,
    grossMarginPercent: data.executive.grossMarginPercent,
    winRate: data.executive.winRate,
    pipelineValue: data.executive.pipelineValue,
    activeProjects: data.executive.activeProjects,
    totalEstimates: data.executive.totalEstimates,
    totalProposals: data.executive.totalProposals,
    averageEstimateSize: data.executive.averageEstimateSize,
    averageProjectMargin: data.executive.averageProjectMargin,
    acceptanceRate: data.proposals.acceptanceRate,
    declineRate: data.proposals.declineRate,
    laborUtilizationPercent: data.estimating.laborUtilizationPercent,
    costVariancePercent: data.estimating.costVariancePercent,
    repeatCustomerRate: data.customers.repeatCustomerRate,
    pipelineStages: data.charts.projectPipeline,
  };
}

export function buildAnalyticsViewModel(data: AnalyticsData): AnalyticsViewModel {
  return {
    kpis: buildAnalyticsKpiSnapshot(data),
    proposalIntelligence: generateProposalIntelligence(
      data.proposalIntelligence,
      data.generatedAt
    ),
    estimateIntelligence: generateEstimateIntelligence(
      data.estimateIntelligence,
      data.generatedAt
    ),
    customerIntelligence: generateCustomerIntelligence(
      data.customerIntelligence,
      data.generatedAt
    ),
    generatedAt: data.generatedAt,
  };
}
