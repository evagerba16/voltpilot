export type AnalyticsDateRange = "7d" | "30d" | "90d" | "12m" | "ytd" | "all";

export type AnalyticsSection =
  | "executive"
  | "estimating"
  | "proposals"
  | "customers"
  | "projects"
  | "ai"
  | "charts";

export type TimeSeriesPoint = {
  period: string;
  label: string;
  value: number;
  count: number;
};

export type PipelineStage = {
  status: string;
  count: number;
  value: number;
};

export type EstimateHistoryItem = {
  id: string;
  title: string;
  projectName: string;
  customerName: string;
  grandTotal: number;
  profitMarginPercent: number;
  status: string;
  updatedAt: string;
};

export type RecentActivityItem = {
  id: string;
  type: "customer" | "project" | "estimate" | "proposal";
  action: string;
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
};

export type CustomerFilterOption = {
  id: string;
  company_name: string;
};

export type ProjectFilterOption = {
  id: string;
  project_name: string;
  customer_id: string;
};

export type AnalyticsFilters = {
  dateRange: AnalyticsDateRange;
  customerId: string;
  projectId: string;
  projectStatus: string;
};

export type ExecutiveKpis = {
  revenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalEstimates: number;
  totalProposals: number;
  winRate: number;
  activeProjects: number;
  pipelineValue: number;
  averageEstimateSize: number;
  averageProjectMargin: number;
  averageEstimateProductionHours: number;
  averageProposalAcceptanceDays: number;
};

export type EstimatingAnalytics = {
  estimateAccuracyPercent: number;
  estimatedTotal: number;
  actualTotal: number;
  costVariancePercent: number;
  laborUtilizationPercent: number;
  materialCostTrend: TimeSeriesPoint[];
  equipmentCostTrend: TimeSeriesPoint[];
  changeOrderCount: number;
  costOverrunCount: number;
  marginByProject: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    marginPercent: number;
    revenue: number;
  }>;
};

export type ProposalAnalytics = {
  acceptanceRate: number;
  declineRate: number;
  averageSalesCycleDays: number;
  averageProposalValue: number;
  revenueWon: number;
  revenueLost: number;
  totalSent: number;
  totalDecided: number;
  proposalVolumeTrend: TimeSeriesPoint[];
};

export type ProposalIntelligenceRecord = {
  id: string;
  title: string;
  projectName: string;
  customerName: string;
  status: string;
  amount: number;
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  decidedAt: string | null;
  updatedAt: string;
  revisionCount: number;
};

export type ProposalIntelligenceInput = {
  dateRange: AnalyticsDateRange;
  proposals: ProposalIntelligenceRecord[];
  followUpDaysThreshold: number;
};

export type EstimateIntelligenceRecord = {
  id: string;
  title: string;
  status: string;
  value: number;
  directCostTotal: number;
  laborTotal: number;
  materialsTotal: number;
  createdAt: string;
  updatedAt: string;
  revisionCount: number;
  creationHours: number;
};

export type EstimateLineItemRecord = {
  estimateId: string;
  category: string;
  description: string;
};

export type EstimateIntelligenceInput = {
  estimates: EstimateIntelligenceRecord[];
  lineItems: EstimateLineItemRecord[];
};

export type CustomerIntelligenceRecord = {
  customerId: string;
  companyName: string;
  revenue: number;
  projectCount: number;
  estimateCount: number;
  projectValueTotal: number;
  averageDaysToPay: number | null;
  paymentEventCount: number;
};

export type CustomerIntelligenceInput = {
  customers: CustomerIntelligenceRecord[];
  activeCustomerCount: number;
};

export type AiOpportunityProposal = {
  id: string;
  title: string;
  projectName: string;
  customerName: string;
  daysSinceSent: number;
};

export type AiOpportunityEstimate = {
  id: string;
  title: string;
  projectName: string;
  marginPercent: number;
};

export type AiOpportunityCustomer = {
  customerId: string;
  companyName: string;
  projectCount: number;
  daysSinceLastProposal: number | null;
};

export type AiOpportunityProjectCost = {
  projectId: string;
  projectName: string;
  customerName: string;
  laborPercent: number;
  materialPercent: number;
};

export type AiOpportunitiesInput = {
  targetMarginPercent: number;
  portfolioGrossMarginPercent: number;
  portfolioLaborPercent: number;
  portfolioMaterialPercent: number;
  staleProposals: AiOpportunityProposal[];
  lowMarginEstimates: AiOpportunityEstimate[];
  customersWithoutRecentProposal: AiOpportunityCustomer[];
  highLaborProjects: AiOpportunityProjectCost[];
  lowMaterialProjects: AiOpportunityProjectCost[];
};

export type CustomerAnalytics = {
  topCustomers: Array<{
    customerId: string;
    companyName: string;
    revenue: number;
    projectCount: number;
    estimateCount: number;
  }>;
  revenueByCustomer: Array<{
    customerId: string;
    companyName: string;
    revenue: number;
  }>;
  repeatCustomerRate: number;
  averageCustomerValue: number;
  customerLifetimeValue: number;
  customerGrowthTrend: TimeSeriesPoint[];
};

export type ProjectAnalytics = {
  projectsByStatus: PipelineStage[];
  revenueByProject: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    revenue: number;
    status: string;
  }>;
  profitabilityByProject: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    marginPercent: number;
    profit: number;
  }>;
  largestProjects: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    value: number;
  }>;
  mostProfitableProjects: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    marginPercent: number;
    profit: number;
  }>;
};

export type AiAnalytics = {
  aiGeneratedEstimates: number;
  aiAdoptionRate: number;
  estimatedTimeSavedHours: number;
  recommendationAcceptanceRate: number;
  averageEstimateCompletionHours: number;
  usageByEstimator: Array<{
    userId: string;
    displayName: string;
    sessionCount: number;
    messageCount: number;
    estimatesAssisted: number;
  }>;
};

export type ChartAnalytics = {
  revenueTrend: TimeSeriesPoint[];
  profitTrend: TimeSeriesPoint[];
  winRateTrend: TimeSeriesPoint[];
  estimateVolumeTrend: TimeSeriesPoint[];
  proposalVolumeTrend: TimeSeriesPoint[];
  projectPipeline: PipelineStage[];
  customerGrowthTrend: TimeSeriesPoint[];
  monthlyRecurringRevenue: number;
  mrrTrend: TimeSeriesPoint[];
};

export type RevenueForecastPipelineItem = {
  id: string;
  kind: "proposal" | "estimate";
  title: string;
  projectName: string;
  value: number;
  status: string;
  marginPercent: number;
  profitAmount: number;
};

export type RevenueForecastInput = {
  pipelineItems: RevenueForecastPipelineItem[];
  historicalWinRate: number;
  targetMarginPercent: number;
  portfolioMarginPercent: number;
};

export type AnalyticsData = {
  filters: AnalyticsFilters;
  generatedAt: string;
  executive: ExecutiveKpis;
  estimating: EstimatingAnalytics;
  proposals: ProposalAnalytics;
  customers: CustomerAnalytics;
  projects: ProjectAnalytics;
  ai: AiAnalytics;
  charts: ChartAnalytics;
  recentEstimates: EstimateHistoryItem[];
  recentActivity: RecentActivityItem[];
  revenueForecast: RevenueForecastInput;
  proposalIntelligence: ProposalIntelligenceInput;
  estimateIntelligence: EstimateIntelligenceInput;
  customerIntelligence: CustomerIntelligenceInput;
  aiOpportunities: AiOpportunitiesInput;
};

export const ANALYTICS_DATE_RANGES: { value: AnalyticsDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

export const ANALYTICS_SECTIONS: { value: AnalyticsSection; label: string }[] = [
  { value: "executive", label: "Executive" },
  { value: "estimating", label: "Estimating" },
  { value: "proposals", label: "Proposals" },
  { value: "customers", label: "Customers" },
  { value: "projects", label: "Projects" },
  { value: "ai", label: "AI" },
  { value: "charts", label: "Charts" },
];
