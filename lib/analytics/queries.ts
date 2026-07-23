import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  average,
  daysBetween,
  getRangeStart,
  groupByPeriod,
  hoursBetween,
  isWithinRange,
  normalizeRelation,
  parseNumber,
  safePercent,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsData,
  AnalyticsFilters,
  CustomerFilterOption,
  EstimateHistoryItem,
  ProjectFilterOption,
  RecentActivityItem,
  RevenueForecastInput,
  RevenueForecastPipelineItem,
  ProposalIntelligenceInput,
  ProposalIntelligenceRecord,
  EstimateIntelligenceInput,
  CustomerIntelligenceInput,
  CustomerIntelligenceRecord,
  AiOpportunitiesInput,
  AiOpportunityCustomer,
  AiOpportunityEstimate,
  AiOpportunityProjectCost,
  AiOpportunityProposal,
} from "@/lib/analytics/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";

type ProjectRow = {
  id: string;
  project_name: string;
  status: string;
  estimated_value: unknown;
  customer_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  assigned_estimator?: string | null;
  customer?: unknown;
};

type EstimateRow = {
  id: string;
  title: string;
  status: string;
  grand_total: unknown;
  selling_price: unknown;
  direct_cost_total: unknown;
  profit_amount: unknown;
  profit_margin_percent: unknown;
  gross_margin_percent: unknown;
  labor_total: unknown;
  materials_total: unknown;
  equipment_total: unknown;
  created_at: string;
  updated_at: string;
  user_id: string;
  project?: unknown;
};

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  amount: unknown;
  estimate_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decided_at: string | null;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  project?: unknown;
};

type VersionRow = {
  estimate_id: string;
  version_number: number;
  label: string;
  snapshot: Record<string, unknown>;
  created_at: string;
};

type AiSessionRow = {
  id: string;
  estimate_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type AiMessageRow = {
  session_id: string;
  recommendations: unknown;
  created_at: string;
};

type JobActualRow = {
  project_id: string;
  actual_total: unknown;
  change_order_count: number;
};

type CustomerRow = {
  id: string;
  company_name: string;
  created_at: string;
};

function matchesCustomerFilter(
  customerId: string | undefined,
  filterCustomerId: string
) {
  if (!filterCustomerId) return true;
  return customerId === filterCustomerId;
}

function matchesProjectFilter(
  projectId: string | undefined,
  filterProjectId: string
) {
  if (!filterProjectId) return true;
  return projectId === filterProjectId;
}

function matchesStatusFilter(status: string, filterStatus: string) {
  if (!filterStatus) return true;
  return status === filterStatus;
}

function getEstimateRevenue(estimate: EstimateRow) {
  return parseNumber(estimate.selling_price ?? estimate.grand_total);
}

function getEstimateProfit(estimate: EstimateRow) {
  const revenue = getEstimateRevenue(estimate);
  const directCost = parseNumber(estimate.direct_cost_total);
  const storedProfit = parseNumber(estimate.profit_amount);

  if (storedProfit > 0) {
    return storedProfit;
  }

  return Math.max(0, revenue - directCost);
}

function getEstimateMargin(estimate: EstimateRow) {
  const margin = parseNumber(
    estimate.gross_margin_percent ?? estimate.profit_margin_percent
  );

  if (margin > 0) {
    return margin;
  }

  const revenue = getEstimateRevenue(estimate);
  if (revenue <= 0) return 0;
  return safePercent(getEstimateProfit(estimate), revenue);
}

function getCustomerName(project: ProjectRow | undefined) {
  const customer = normalizeRelation<{ company_name?: string }>(project?.customer);
  return customer?.company_name ?? "Unknown customer";
}

function filterProject(project: ProjectRow, filters: AnalyticsFilters, rangeStart: Date | null) {
  if (project.archived_at) return false;
  if (!matchesCustomerFilter(project.customer_id, filters.customerId)) return false;
  if (!matchesProjectFilter(project.id, filters.projectId)) return false;
  if (!matchesStatusFilter(project.status, filters.projectStatus)) return false;
  return isWithinRange(project.updated_at, rangeStart);
}

function filterEstimate(
  estimate: EstimateRow,
  filters: AnalyticsFilters,
  rangeStart: Date | null
) {
  const project = normalizeRelation<ProjectRow>(estimate.project);
  if (!project) return false;
  if (!matchesCustomerFilter(project.customer_id, filters.customerId)) return false;
  if (!matchesProjectFilter(project.id, filters.projectId)) return false;
  if (!matchesStatusFilter(project.status, filters.projectStatus)) return false;
  return isWithinRange(estimate.updated_at, rangeStart);
}

function filterProposal(
  proposal: ProposalRow,
  filters: AnalyticsFilters,
  rangeStart: Date | null
) {
  const project = normalizeRelation<ProjectRow>(proposal.project);
  if (!project) return false;
  if (!matchesCustomerFilter(project.customer_id, filters.customerId)) return false;
  if (!matchesProjectFilter(project.id, filters.projectId)) return false;
  if (!matchesStatusFilter(project.status, filters.projectStatus)) return false;
  return isWithinRange(proposal.updated_at, rangeStart);
}

function snapshotDirectCost(snapshot: Record<string, unknown>) {
  return parseNumber(snapshot.direct_cost_total);
}

function snapshotGrandTotal(snapshot: Record<string, unknown>) {
  return parseNumber(snapshot.selling_price ?? snapshot.grand_total);
}

type ProposalRevisionRow = {
  proposal_id: string;
};

type EstimateLineItemRow = {
  estimate_id: string;
  category: string;
  description: string;
};

async function fetchEstimateVersionsForIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateIds: string[]
): Promise<VersionRow[]> {
  if (estimateIds.length === 0) {
    return [];
  }

  const chunkSize = 200;
  const versions: VersionRow[] = [];

  for (let index = 0; index < estimateIds.length; index += chunkSize) {
    const chunk = estimateIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("estimate_versions")
      .select("estimate_id, version_number, label, snapshot, created_at")
      .in("estimate_id", chunk)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message.includes("estimate_versions")) {
        return versions;
      }

      throw new Error(error.message);
    }

    versions.push(...((data ?? []) as VersionRow[]));
  }

  return versions;
}

async function fetchAiSessionsForEstimateIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateIds: string[]
): Promise<AiSessionRow[]> {
  if (estimateIds.length === 0) {
    return [];
  }

  const chunkSize = 200;
  const sessions: AiSessionRow[] = [];

  for (let index = 0; index < estimateIds.length; index += chunkSize) {
    const chunk = estimateIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("estimate_ai_sessions")
      .select("id, estimate_id, user_id, created_at, updated_at")
      .in("estimate_id", chunk);

    if (error) {
      if (error.message.includes("estimate_ai_sessions")) {
        return sessions;
      }

      throw new Error(error.message);
    }

    sessions.push(...((data ?? []) as AiSessionRow[]));
  }

  return sessions;
}

async function fetchAiMessagesForSessionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionIds: string[]
): Promise<AiMessageRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const chunkSize = 200;
  const messages: AiMessageRow[] = [];

  for (let index = 0; index < sessionIds.length; index += chunkSize) {
    const chunk = sessionIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("estimate_ai_messages")
      .select("session_id, recommendations, created_at")
      .in("session_id", chunk);

    if (error) {
      if (error.message.includes("estimate_ai_messages")) {
        return messages;
      }

      throw new Error(error.message);
    }

    messages.push(...((data ?? []) as AiMessageRow[]));
  }

  return messages;
}

async function fetchEstimateLineItemsForIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateIds: string[]
): Promise<EstimateLineItemRow[]> {
  if (estimateIds.length === 0) {
    return [];
  }

  const chunkSize = 200;
  const items: EstimateLineItemRow[] = [];

  for (let index = 0; index < estimateIds.length; index += chunkSize) {
    const chunk = estimateIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("estimate_line_items")
      .select("estimate_id, category, description")
      .in("estimate_id", chunk);

    if (error) {
      if (error.message.includes("estimate_line_items")) {
        return items;
      }

      throw new Error(error.message);
    }

    items.push(...((data ?? []) as EstimateLineItemRow[]));
  }

  return items;
}

const PROPOSAL_FOLLOW_UP_DAYS = 7;
const AI_OPPORTUNITY_PROPOSAL_DAYS = 5;
const AI_OPPORTUNITY_CUSTOMER_PROPOSAL_DAYS = 30;
const HIGH_LABOR_DELTA = 12;
const LOW_MATERIAL_DELTA = 12;
const OPEN_PROPOSAL_STATUSES = new Set(["Draft", "Sent", "Viewed"]);
const CLOSED_PROJECT_STATUSES = new Set(["Awarded", "Lost", "Archived"]);
const TARGET_MARGIN_PERCENT = 15;

function buildEstimateLookupMaps(estimates: EstimateRow[]) {
  const estimateById = new Map<string, EstimateRow>();
  const bestEstimateByProject = new Map<string, EstimateRow>();

  for (const estimate of estimates) {
    estimateById.set(estimate.id, estimate);

    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project) continue;

    const existing = bestEstimateByProject.get(project.id);
    if (!existing || getEstimateRevenue(estimate) > getEstimateRevenue(existing)) {
      bestEstimateByProject.set(project.id, estimate);
    }
  }

  return { estimateById, bestEstimateByProject };
}

function resolvePipelineItemMargin(
  estimate: EstimateRow | undefined,
  portfolioMarginPercent: number
) {
  if (!estimate) {
    return portfolioMarginPercent;
  }

  const margin = getEstimateMargin(estimate);
  return margin > 0 ? margin : portfolioMarginPercent;
}

function buildPipelineItemEconomics(
  value: number,
  marginPercent: number,
  estimate: EstimateRow | undefined
) {
  const profitFromEstimate = estimate ? getEstimateProfit(estimate) : 0;
  const profitAmount =
    profitFromEstimate > 0
      ? profitFromEstimate
      : value * (marginPercent / 100);

  return { marginPercent, profitAmount };
}

function buildRevenueForecastInput(
  estimates: EstimateRow[],
  proposals: ProposalRow[],
  historicalWinRate: number,
  portfolioMarginPercent: number
): RevenueForecastInput {
  const items: RevenueForecastPipelineItem[] = [];
  const projectsWithOpenProposal = new Set<string>();
  const { estimateById, bestEstimateByProject } = buildEstimateLookupMaps(estimates);

  for (const proposal of proposals) {
    if (!OPEN_PROPOSAL_STATUSES.has(proposal.status)) continue;

    const project = normalizeRelation<ProjectRow>(proposal.project);
    if (!project || CLOSED_PROJECT_STATUSES.has(project.status)) continue;

    const value = parseNumber(proposal.amount);
    if (value <= 0) continue;

    const linkedEstimate =
      (proposal.estimate_id ? estimateById.get(proposal.estimate_id) : undefined) ??
      bestEstimateByProject.get(project.id);
    const marginPercent = resolvePipelineItemMargin(
      linkedEstimate,
      portfolioMarginPercent
    );
    const economics = buildPipelineItemEconomics(
      value,
      marginPercent,
      linkedEstimate
    );

    projectsWithOpenProposal.add(project.id);
    items.push({
      id: `proposal-${proposal.id}`,
      kind: "proposal",
      title: proposal.title,
      projectName: project.project_name,
      value,
      status: proposal.status,
      marginPercent: economics.marginPercent,
      profitAmount: economics.profitAmount,
    });
  }

  for (const estimate of bestEstimateByProject.values()) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project) continue;
    if (projectsWithOpenProposal.has(project.id)) continue;
    if (CLOSED_PROJECT_STATUSES.has(project.status)) continue;

    const value = getEstimateRevenue(estimate);
    if (value <= 0) continue;

    const marginPercent = resolvePipelineItemMargin(estimate, portfolioMarginPercent);
    const economics = buildPipelineItemEconomics(value, marginPercent, estimate);

    items.push({
      id: `estimate-${estimate.id}`,
      kind: "estimate",
      title: estimate.title,
      projectName: project.project_name,
      value,
      status: estimate.status,
      marginPercent: economics.marginPercent,
      profitAmount: economics.profitAmount,
    });
  }

  return {
    pipelineItems: items,
    historicalWinRate,
    targetMarginPercent: TARGET_MARGIN_PERCENT,
    portfolioMarginPercent,
  };
}

function buildProposalIntelligenceInput(
  proposals: ProposalRow[],
  revisionCounts: Map<string, number>,
  dateRange: AnalyticsFilters["dateRange"]
): ProposalIntelligenceInput {
  return {
    dateRange,
    followUpDaysThreshold: PROPOSAL_FOLLOW_UP_DAYS,
    proposals: proposals.map((proposal) => {
      const project = normalizeRelation<ProjectRow>(proposal.project);

      return {
        id: proposal.id,
        title: proposal.title,
        projectName: project?.project_name ?? "Unknown project",
        customerName: getCustomerName(project),
        status: proposal.status,
        amount: parseNumber(proposal.amount),
        createdAt: proposal.created_at,
        sentAt: proposal.sent_at,
        acceptedAt: proposal.accepted_at,
        decidedAt: proposal.decided_at,
        updatedAt: proposal.updated_at,
        revisionCount: revisionCounts.get(proposal.id) ?? 0,
      } satisfies ProposalIntelligenceRecord;
    }),
  };
}

function buildEstimateIntelligenceInput(
  estimates: EstimateRow[],
  versionCounts: Map<string, number>,
  lineItems: EstimateLineItemRow[]
): EstimateIntelligenceInput {
  return {
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      title: estimate.title,
      status: estimate.status,
      value: getEstimateRevenue(estimate),
      directCostTotal: parseNumber(estimate.direct_cost_total),
      laborTotal: parseNumber(estimate.labor_total),
      materialsTotal: parseNumber(estimate.materials_total),
      createdAt: estimate.created_at,
      updatedAt: estimate.updated_at,
      revisionCount: versionCounts.get(estimate.id) ?? 0,
      creationHours: hoursBetween(estimate.created_at, estimate.updated_at),
    })),
    lineItems: lineItems.map((item) => ({
      estimateId: item.estimate_id,
      category: item.category,
      description: item.description,
    })),
  };
}

function buildCustomerIntelligenceInput(
  customerStats: Map<
    string,
    {
      companyName: string;
      revenue: number;
      projectIds: Set<string>;
      estimateCount: number;
      projectValueTotal: number;
      averageDaysToPay: number | null;
      paymentEventCount: number;
    }
  >
): CustomerIntelligenceInput {
  const customers: CustomerIntelligenceRecord[] = [...customerStats.entries()]
    .map(([customerId, entry]) => ({
      customerId,
      companyName: entry.companyName,
      revenue: entry.revenue,
      projectCount: entry.projectIds.size,
      estimateCount: entry.estimateCount,
      projectValueTotal: entry.projectValueTotal,
      averageDaysToPay: entry.averageDaysToPay,
      paymentEventCount: entry.paymentEventCount,
    }))
    .filter(
      (entry) =>
        entry.revenue > 0 || entry.projectCount > 0 || entry.estimateCount > 0
    );

  return {
    customers,
    activeCustomerCount: customers.length,
  };
}

function buildAiOpportunitiesInput(
  estimates: EstimateRow[],
  proposals: ProposalRow[],
  projects: ProjectRow[],
  targetMarginPercent: number,
  portfolioGrossMarginPercent: number,
  portfolioLaborPercent: number,
  portfolioMaterialPercent: number
): AiOpportunitiesInput {
  const nowIso = new Date().toISOString();
  const staleProposals: AiOpportunityProposal[] = [];
  const lowMarginEstimates: AiOpportunityEstimate[] = [];
  const projectCostProfiles = new Map<
    string,
    AiOpportunityProjectCost & { updatedAt: string }
  >();
  const lastProposalSentByCustomer = new Map<string, string>();
  const activeCustomerIds = new Set<string>();

  for (const proposal of proposals) {
    const project = normalizeRelation<ProjectRow>(proposal.project);
    if (!project?.customer_id) continue;

    if (proposal.sent_at) {
      const existing = lastProposalSentByCustomer.get(project.customer_id);
      if (
        !existing ||
        new Date(proposal.sent_at).getTime() > new Date(existing).getTime()
      ) {
        lastProposalSentByCustomer.set(project.customer_id, proposal.sent_at);
      }
    }

    if (proposal.status !== "Sent" && proposal.status !== "Viewed") {
      continue;
    }

    const sentAt = proposal.sent_at ?? proposal.updated_at;
    staleProposals.push({
      id: proposal.id,
      title: proposal.title,
      projectName: project.project_name,
      customerName: getCustomerName(project),
      daysSinceSent: daysBetween(sentAt, nowIso),
    });
  }

  for (const estimate of estimates) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project) continue;

    const marginPercent = getEstimateMargin(estimate);
    if (marginPercent > 0) {
      lowMarginEstimates.push({
        id: estimate.id,
        title: estimate.title,
        projectName: project.project_name,
        marginPercent,
      });
    }

    const directCost = parseNumber(estimate.direct_cost_total);
    if (directCost <= 0) {
      continue;
    }

    const laborPercent = safePercent(
      parseNumber(estimate.labor_total),
      directCost
    );
    const materialPercent = safePercent(
      parseNumber(estimate.materials_total),
      directCost
    );

    const existing = projectCostProfiles.get(project.id);
    if (
      !existing ||
      new Date(estimate.updated_at).getTime() > new Date(existing.updatedAt).getTime()
    ) {
      projectCostProfiles.set(project.id, {
        projectId: project.id,
        projectName: project.project_name,
        customerName: getCustomerName(project),
        laborPercent,
        materialPercent,
        updatedAt: estimate.updated_at,
      });
    }
  }

  for (const project of projects) {
    if (["Archived", "Lost", "Awarded"].includes(project.status)) {
      continue;
    }

    activeCustomerIds.add(project.customer_id);
  }

  const laborThreshold = Math.max(
    55,
    portfolioLaborPercent + HIGH_LABOR_DELTA
  );
  const materialThreshold = Math.max(
    8,
    portfolioMaterialPercent - LOW_MATERIAL_DELTA
  );

  const highLaborProjects = [...projectCostProfiles.values()]
    .filter((project) => project.laborPercent >= laborThreshold)
    .sort((a, b) => b.laborPercent - a.laborPercent)
    .map(({ projectId, projectName, customerName, laborPercent, materialPercent }) => ({
      projectId,
      projectName,
      customerName,
      laborPercent,
      materialPercent,
    }));

  const lowMaterialProjects = [...projectCostProfiles.values()]
    .filter(
      (project) =>
        portfolioMaterialPercent > 0 &&
        project.materialPercent <= materialThreshold
    )
    .sort((a, b) => a.materialPercent - b.materialPercent)
    .map(({ projectId, projectName, customerName, laborPercent, materialPercent }) => ({
      projectId,
      projectName,
      customerName,
      laborPercent,
      materialPercent,
    }));

  const customersWithoutRecentProposal: AiOpportunityCustomer[] = [];
  const customerProjectCounts = new Map<string, number>();

  for (const project of projects) {
    if (["Archived", "Lost"].includes(project.status)) {
      continue;
    }

    customerProjectCounts.set(
      project.customer_id,
      (customerProjectCounts.get(project.customer_id) ?? 0) + 1
    );
  }

  for (const customerId of activeCustomerIds) {
    const projectCount = customerProjectCounts.get(customerId) ?? 0;
    if (projectCount === 0) {
      continue;
    }

    const lastSent = lastProposalSentByCustomer.get(customerId) ?? null;

    const sampleProject = projects.find(
      (project) => project.customer_id === customerId
    );
    const companyName = sampleProject
      ? getCustomerName(sampleProject)
      : "Unknown customer";

    customersWithoutRecentProposal.push({
      customerId,
      companyName,
      projectCount,
      daysSinceLastProposal: lastSent ? daysBetween(lastSent, nowIso) : null,
    });
  }

  customersWithoutRecentProposal.sort((a, b) => {
    if (a.daysSinceLastProposal === null && b.daysSinceLastProposal === null) {
      return b.projectCount - a.projectCount;
    }

    if (a.daysSinceLastProposal === null) {
      return -1;
    }

    if (b.daysSinceLastProposal === null) {
      return 1;
    }

    return b.daysSinceLastProposal - a.daysSinceLastProposal;
  });

  return {
    targetMarginPercent,
    portfolioGrossMarginPercent,
    portfolioLaborPercent,
    portfolioMaterialPercent,
    staleProposals: staleProposals.filter(
      (proposal) => proposal.daysSinceSent >= AI_OPPORTUNITY_PROPOSAL_DAYS
    ),
    lowMarginEstimates,
    customersWithoutRecentProposal: customersWithoutRecentProposal.filter(
      (customer) =>
        customer.daysSinceLastProposal === null ||
        customer.daysSinceLastProposal >= AI_OPPORTUNITY_CUSTOMER_PROPOSAL_DAYS
    ),
    highLaborProjects,
    lowMaterialProjects,
  };
}

export async function getCustomerFilterOptions(): Promise<CustomerFilterOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerFilterOption[];
}

export async function getProjectFilterOptions(
  customerId?: string
): Promise<ProjectFilterOption[]> {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, project_name, customer_id")
    .is("archived_at", null)
    .order("project_name", { ascending: true });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectFilterOption[];
}

export async function getAnalyticsData(
  filters: AnalyticsFilters
): Promise<AnalyticsData> {
  const supabase = await createClient();
  const rangeStart = getRangeStart(filters.dateRange);
  const rangeStartIso = rangeStart?.toISOString();

  const applyRange = <T extends { gte: (col: string, val: string) => T }>(query: T) => {
    if (!rangeStartIso) return query;
    return query.gte("updated_at", rangeStartIso);
  };

  const [
    customersResult,
    projectsResult,
    estimatesResult,
    proposalsResult,
    jobActualsResult,
    teamMembersResult,
    proposalRevisionsResult,
  ] = await Promise.all([
    supabase.from("customers").select("id, company_name, created_at"),
    applyRange(
      supabase
        .from("projects")
        .select(
          "id, project_name, status, estimated_value, customer_id, created_at, updated_at, archived_at, assigned_estimator, customer:customers!inner (id, company_name)"
        )
        .is("archived_at", null)
    ),
    applyRange(
      supabase
        .from("estimates")
        .select(
          `
          id, title, status, grand_total, selling_price, direct_cost_total,
          profit_amount, profit_margin_percent, gross_margin_percent,
          labor_total, materials_total, equipment_total,
          created_at, updated_at, user_id,
          project:projects!inner (
            id, project_name, customer_id, status,
            customer:customers!inner (id, company_name)
          )
        `
        )
        .order("updated_at", { ascending: false })
    ),
    applyRange(
      supabase
        .from("proposals")
        .select(
          `
          id, title, status, amount, estimate_id, sent_at, accepted_at, declined_at,
          decided_at, first_viewed_at, created_at, updated_at,
          project:projects!inner (
            id, project_name, customer_id, status,
            customer:customers!inner (id, company_name)
          )
        `
        )
        .order("updated_at", { ascending: false })
    ),
    supabase
      .from("project_job_actuals")
      .select("project_id, actual_total, change_order_count"),
    supabase
      .from("team_members")
      .select("user_id, display_name, email")
      .eq("status", "active"),
    supabase.from("proposal_revisions").select("proposal_id"),
  ]);

  if (customersResult.error) throw new Error(customersResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (estimatesResult.error) throw new Error(estimatesResult.error.message);

  const proposals =
    proposalsResult.error &&
    proposalsResult.error.message.includes("proposals")
      ? []
      : ((proposalsResult.data ?? []) as ProposalRow[]);

  if (
    proposalsResult.error &&
    !proposalsResult.error.message.includes("proposals")
  ) {
    throw new Error(proposalsResult.error.message);
  }

  const jobActuals =
    jobActualsResult.error &&
    jobActualsResult.error.message.includes("project_job_actuals")
      ? []
      : ((jobActualsResult.data ?? []) as JobActualRow[]);

  const teamMembers = teamMembersResult.error ? [] : (teamMembersResult.data ?? []);

  const proposalRevisions =
    proposalRevisionsResult.error &&
    proposalRevisionsResult.error.message.includes("proposal_revisions")
      ? []
      : ((proposalRevisionsResult.data ?? []) as ProposalRevisionRow[]);

  const revisionCounts = new Map<string, number>();
  for (const revision of proposalRevisions) {
    revisionCounts.set(
      revision.proposal_id,
      (revisionCounts.get(revision.proposal_id) ?? 0) + 1
    );
  }

  const projects = (projectsResult.data ?? [] as ProjectRow[]).filter((project) =>
    filterProject(project as ProjectRow, filters, rangeStart)
  ) as ProjectRow[];

  const estimates = (estimatesResult.data ?? [] as EstimateRow[]).filter((estimate) =>
    filterEstimate(estimate as EstimateRow, filters, rangeStart)
  ) as EstimateRow[];

  const proposalsFiltered = proposals.filter((proposal) =>
    filterProposal(proposal, filters, rangeStart)
  );

  const filteredEstimateIds = new Set(estimates.map((estimate) => estimate.id));
  const filteredProjectIds = new Set(projects.map((project) => project.id));
  const estimateIdList = [...filteredEstimateIds];

  const [estimateLineItems, versions, aiSessions] = await Promise.all([
    fetchEstimateLineItemsForIds(supabase, estimateIdList),
    fetchEstimateVersionsForIds(supabase, estimateIdList),
    fetchAiSessionsForEstimateIds(supabase, estimateIdList),
  ]);

  const aiSessionIds = aiSessions
    .filter((session) => isWithinRange(session.updated_at, rangeStart))
    .map((session) => session.id);
  const aiMessages = await fetchAiMessagesForSessionIds(supabase, aiSessionIds);

  const versionsFiltered = versions;

  const estimateVersionCounts = new Map<string, number>();
  for (const version of versionsFiltered) {
    estimateVersionCounts.set(
      version.estimate_id,
      (estimateVersionCounts.get(version.estimate_id) ?? 0) + 1
    );
  }

  const filteredLineItems = estimateLineItems;

  const aiSessionsFiltered = aiSessions.filter((session) => {
    if (!filteredEstimateIds.has(session.estimate_id)) return false;
    return isWithinRange(session.updated_at, rangeStart);
  });

  const filteredAiSessionIds = new Set(aiSessionsFiltered.map((session) => session.id));
  const aiMessagesFiltered = aiMessages.filter((message) =>
    filteredAiSessionIds.has(message.session_id)
  );

  const jobActualsFiltered = jobActuals.filter((row) =>
    filteredProjectIds.has(row.project_id)
  );

  const customers = (customersResult.data ?? [] as CustomerRow[]).filter((customer) => {
    if (!isWithinRange(customer.created_at, rangeStart)) return false;
    if (filters.customerId && customer.id !== filters.customerId) return false;
    return true;
  }) as CustomerRow[];

  const acceptedProposals = proposalsFiltered.filter(
    (proposal) => proposal.status === "Accepted"
  );
  const declinedProposals = proposalsFiltered.filter(
    (proposal) => proposal.status === "Declined"
  );
  const decidedProposals = proposalsFiltered.filter((proposal) =>
    ["Accepted", "Declined"].includes(proposal.status)
  );

  const revenue = acceptedProposals.reduce(
    (sum, proposal) => sum + parseNumber(proposal.amount),
    0
  );

  const revenueLost = declinedProposals.reduce(
    (sum, proposal) => sum + parseNumber(proposal.amount),
    0
  );

  const grossProfit = estimates.reduce(
    (sum, estimate) => sum + getEstimateProfit(estimate),
    0
  );

  const grossMarginPercent = safePercent(grossProfit, estimates.reduce(
    (sum, estimate) => sum + getEstimateRevenue(estimate),
    0
  ));

  const pipelineValue = estimates.reduce(
    (sum, estimate) => sum + getEstimateRevenue(estimate),
    0
  );

  const estimateSizes = estimates.map(getEstimateRevenue).filter((value) => value > 0);
  const projectMargins = estimates.map(getEstimateMargin).filter((value) => value > 0);

  const productionHours = estimates
    .filter((estimate) => estimate.status === "Final")
    .map((estimate) => hoursBetween(estimate.created_at, estimate.updated_at));

  const acceptanceDays = acceptedProposals
    .filter((proposal) => proposal.sent_at && proposal.accepted_at)
    .map((proposal) =>
      daysBetween(proposal.sent_at!, proposal.accepted_at!)
    );

  const salesCycleDays = decidedProposals
    .filter((proposal) => proposal.sent_at && proposal.decided_at)
    .map((proposal) =>
      daysBetween(proposal.sent_at!, proposal.decided_at!)
    );

  const versionsByEstimate = new Map<string, VersionRow[]>();
  for (const version of versionsFiltered) {
    const list = versionsByEstimate.get(version.estimate_id) ?? [];
    list.push(version);
    versionsByEstimate.set(version.estimate_id, list);
  }

  let changeOrderCount = 0;
  let costOverrunCount = 0;
  const accuracySamples: number[] = [];

  for (const [, estimateVersions] of versionsByEstimate) {
    if (estimateVersions.length <= 1) continue;

    changeOrderCount += estimateVersions.length - 1;

    const first = estimateVersions[0];
    const last = estimateVersions[estimateVersions.length - 1];
    const firstCost = snapshotDirectCost(first.snapshot);
    const lastCost = snapshotDirectCost(last.snapshot);

    if (firstCost > 0 && lastCost > firstCost * 1.05) {
      costOverrunCount += 1;
    }

    const firstTotal = snapshotGrandTotal(first.snapshot);
    const lastTotal = snapshotGrandTotal(last.snapshot);
    if (firstTotal > 0) {
      const variance = Math.abs(lastTotal - firstTotal) / firstTotal;
      accuracySamples.push(Math.max(0, 100 - variance * 100));
    }
  }

  for (const actual of jobActualsFiltered) {
    changeOrderCount += actual.change_order_count ?? 0;
  }

  const jobActualsByProject = new Map(
    jobActualsFiltered.map((row) => [row.project_id, parseNumber(row.actual_total)])
  );

  const estimateDirectCostByProject = new Map<string, number>();
  for (const estimate of estimates) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project?.id) continue;
    const current = estimateDirectCostByProject.get(project.id) ?? 0;
    estimateDirectCostByProject.set(
      project.id,
      current + parseNumber(estimate.direct_cost_total)
    );
  }

  let estimatedTotal = 0;
  let actualTotal = 0;

  for (const projectId of filteredProjectIds) {
    const estimatedForProject = estimateDirectCostByProject.get(projectId) ?? 0;
    const actualForProject = jobActualsByProject.get(projectId);

    if (actualForProject !== undefined && actualForProject > 0) {
      estimatedTotal += estimatedForProject;
      actualTotal += actualForProject;
      continue;
    }

    const projectEstimates = estimates.filter((estimate) => {
      const project = normalizeRelation<ProjectRow>(estimate.project);
      return project?.id === projectId;
    });

    for (const estimate of projectEstimates) {
      const estimateVersions = versionsByEstimate.get(estimate.id) ?? [];
      estimatedTotal += parseNumber(estimate.direct_cost_total);

      if (estimateVersions.length > 0) {
        const last = estimateVersions[estimateVersions.length - 1];
        actualTotal += snapshotDirectCost(last.snapshot);
      } else {
        actualTotal += parseNumber(estimate.direct_cost_total);
      }
    }
  }

  const laborTotal = estimates.reduce(
    (sum, estimate) => sum + parseNumber(estimate.labor_total),
    0
  );

  const laborUtilizationPercent = safePercent(laborTotal, estimatedTotal);

  const materialCostTrend = groupByPeriod(
    estimates.map((estimate) => ({
      created_at: estimate.created_at,
      value: parseNumber(estimate.materials_total),
    })),
    filters.dateRange,
    (item) => item.value
  );

  const equipmentCostTrend = groupByPeriod(
    estimates.map((estimate) => ({
      created_at: estimate.created_at,
      value: parseNumber(estimate.equipment_total),
    })),
    filters.dateRange,
    (item) => item.value
  );

  const marginByProjectMap = new Map<
    string,
    { projectName: string; customerName: string; margins: number[]; revenue: number }
  >();

  for (const estimate of estimates) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project?.id) continue;

    const entry =
      marginByProjectMap.get(project.id) ??
      {
        projectName: project.project_name,
        customerName: getCustomerName(project),
        margins: [],
        revenue: 0,
      };

    entry.margins.push(getEstimateMargin(estimate));
    entry.revenue += getEstimateRevenue(estimate);
    marginByProjectMap.set(project.id, entry);
  }

  const marginByProject = [...marginByProjectMap.entries()]
    .map(([projectId, entry]) => ({
      projectId,
      projectName: entry.projectName,
      customerName: entry.customerName,
      marginPercent: average(entry.margins),
      revenue: entry.revenue,
    }))
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 10);

  const customerStats = new Map<
    string,
    {
      companyName: string;
      revenue: number;
      projectIds: Set<string>;
      estimateCount: number;
      createdAt: string;
      projectValueTotal: number;
      averageDaysToPay: number | null;
      paymentEventCount: number;
    }
  >();

  for (const customer of customersResult.data ?? []) {
    customerStats.set(customer.id, {
      companyName: customer.company_name,
      revenue: 0,
      projectIds: new Set(),
      estimateCount: 0,
      createdAt: customer.created_at,
      projectValueTotal: 0,
      averageDaysToPay: null,
      paymentEventCount: 0,
    });
  }

  for (const project of projects) {
    const stats = customerStats.get(project.customer_id);
    if (!stats) continue;
    stats.projectIds.add(project.id);
    stats.projectValueTotal += parseNumber(project.estimated_value);
    stats.revenue += parseNumber(project.estimated_value);
  }

  for (const estimate of estimates) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    if (!project?.customer_id) continue;
    const stats = customerStats.get(project.customer_id);
    if (!stats) continue;
    stats.estimateCount += 1;
    stats.revenue += getEstimateRevenue(estimate);
  }

  for (const proposal of acceptedProposals) {
    const project = normalizeRelation<ProjectRow>(proposal.project);
    if (!project?.customer_id) continue;
    const stats = customerStats.get(project.customer_id);
    if (!stats) continue;
    stats.revenue += parseNumber(proposal.amount);
  }

  const customerEntries = [...customerStats.values()].filter(
    (entry) => entry.revenue > 0 || entry.projectIds.size > 0 || entry.estimateCount > 0
  );

  const repeatCustomers = customerEntries.filter(
    (entry) => entry.projectIds.size > 1
  ).length;

  const topCustomers = [...customerStats.entries()]
    .map(([customerId, entry]) => ({
      customerId,
      companyName: entry.companyName,
      revenue: entry.revenue,
      projectCount: entry.projectIds.size,
      estimateCount: entry.estimateCount,
    }))
    .filter(
      (entry) => entry.revenue > 0 || entry.projectCount > 0 || entry.estimateCount > 0
    )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const revenueByCustomer = topCustomers.map((customer) => ({
    customerId: customer.customerId,
    companyName: customer.companyName,
    revenue: customer.revenue,
  }));

  const customerValues = customerEntries
    .map((entry) => entry.revenue)
    .filter((value) => value > 0);

  const pipelineStatuses = filters.projectStatus
    ? [filters.projectStatus]
    : PROJECT_STATUSES.filter((status) => status !== "Archived");

  const projectsByStatus = pipelineStatuses.map((status) => {
    const statusProjects = projects.filter((project) => project.status === status);
    return {
      status,
      count: statusProjects.length,
      value: statusProjects.reduce(
        (sum, project) => sum + parseNumber(project.estimated_value),
        0
      ),
    };
  });

  const revenueByProject = projects
    .map((project) => ({
      projectId: project.id,
      projectName: project.project_name,
      customerName: getCustomerName(project),
      revenue: parseNumber(project.estimated_value),
      status: project.status,
    }))
    .filter((project) => project.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const profitabilityByProject = marginByProject.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
    customerName: project.customerName,
    marginPercent: project.marginPercent,
    profit: project.revenue * (project.marginPercent / 100),
  }));

  const largestProjects = projects
    .map((project) => ({
      projectId: project.id,
      projectName: project.project_name,
      customerName: getCustomerName(project),
      value: parseNumber(project.estimated_value),
    }))
    .filter((project) => project.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const mostProfitableProjects = [...profitabilityByProject]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const avgProjectsPerCustomer = average(
    customerEntries.map((entry) => entry.projectIds.size).filter((count) => count > 0)
  );

  const aiEstimateIds = new Set(aiSessionsFiltered.map((session) => session.estimate_id));
  const recommendationMessages = aiMessagesFiltered.filter(
    (message) => message.recommendations !== null
  );

  const sessionsWithRecommendations = new Set(
    recommendationMessages.map((message) => message.session_id)
  );

  const aiAcceptedEstimateIds = new Set(
    versionsFiltered
      .filter((version) => version.label === "AI generated")
      .map((version) => version.estimate_id)
  );

  const nonAiCompletionHours = estimates
    .filter(
      (estimate) => estimate.status === "Final" && !aiEstimateIds.has(estimate.id)
    )
    .map((estimate) => hoursBetween(estimate.created_at, estimate.updated_at));

  const aiCompletionHours = estimates
    .filter(
      (estimate) => estimate.status === "Final" && aiEstimateIds.has(estimate.id)
    )
    .map((estimate) => hoursBetween(estimate.created_at, estimate.updated_at));

  const nonAiAverageCompletion = average(nonAiCompletionHours);
  const aiAverageCompletion = average(aiCompletionHours);
  const completionDelta = Math.max(0, nonAiAverageCompletion - aiAverageCompletion);

  const sessionTimeSaved = aiSessionsFiltered
    .filter((session) => sessionsWithRecommendations.has(session.id))
    .reduce(
      (sum, session) =>
        sum +
        Math.min(
          2,
          Math.max(0.25, hoursBetween(session.created_at, session.updated_at))
        ),
      0
    );

  const estimatedTimeSavedHours =
    aiCompletionHours.length * completionDelta + sessionTimeSaved;

  const estimatesWithRecommendations = new Set(
    aiSessionsFiltered
      .filter((session) => sessionsWithRecommendations.has(session.id))
      .map((session) => session.estimate_id)
  );

  const estimatorNames = new Map<string, string>();
  for (const member of teamMembers) {
    if (member.user_id) {
      estimatorNames.set(
        member.user_id,
        member.display_name || member.email || "Team member"
      );
    }
  }

  const usageByEstimatorMap = new Map<
    string,
    { sessionCount: number; messageCount: number; estimates: Set<string> }
  >();

  for (const session of aiSessionsFiltered) {
    const entry =
      usageByEstimatorMap.get(session.user_id) ??
      { sessionCount: 0, messageCount: 0, estimates: new Set<string>() };

    entry.sessionCount += 1;
    entry.estimates.add(session.estimate_id);
    usageByEstimatorMap.set(session.user_id, entry);
  }

  for (const message of aiMessagesFiltered) {
    const session = aiSessionsFiltered.find((row) => row.id === message.session_id);
    if (!session) continue;
    const entry = usageByEstimatorMap.get(session.user_id);
    if (!entry) continue;
    entry.messageCount += 1;
  }

  const usageByEstimator = [...usageByEstimatorMap.entries()]
    .map(([userId, entry]) => ({
      userId,
      displayName: estimatorNames.get(userId) ?? "Estimator",
      sessionCount: entry.sessionCount,
      messageCount: entry.messageCount,
      estimatesAssisted: entry.estimates.size,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const revenueTrend = groupByPeriod(
    estimates.map((estimate) => ({
      created_at: estimate.created_at,
      value: getEstimateRevenue(estimate),
    })),
    filters.dateRange,
    (item) => item.value
  );

  const profitTrend = groupByPeriod(
    estimates.map((estimate) => ({
      created_at: estimate.created_at,
      value: getEstimateProfit(estimate),
    })),
    filters.dateRange,
    (item) => item.value
  );

  const estimateVolumeTrend = groupByPeriod(
    estimates.map((estimate) => ({
      created_at: estimate.created_at,
      value: 1,
    })),
    filters.dateRange,
    (item) => item.value
  );

  const proposalVolumeTrend = groupByPeriod(
    proposalsFiltered.map((proposal) => ({
      created_at: proposal.created_at,
      value: 1,
    })),
    filters.dateRange,
    (item) => item.value
  );

  const winRateTrend = buildTimeBucketsWithWinRate(
    proposalsFiltered,
    filters.dateRange
  );

  const customerGrowthTrend = groupByPeriod(
    (customersResult.data ?? [])
      .filter((customer) => {
        if (filters.customerId && customer.id !== filters.customerId) return false;
        return true;
      })
      .map((customer) => ({
        created_at: customer.created_at,
        value: 1,
      })),
    filters.dateRange,
    (item) => item.value
  );

  const awardedProjects = projects.filter((project) => project.status === "Awarded");
  const monthlyRecurringRevenue =
    awardedProjects.reduce(
      (sum, project) => sum + parseNumber(project.estimated_value),
      0
    ) / 12;

  const mrrTrend = groupByPeriod(
    awardedProjects.map((project) => ({
      created_at: project.updated_at,
      value: parseNumber(project.estimated_value) / 12,
    })),
    filters.dateRange,
    (item) => item.value
  );

  const recentEstimates: EstimateHistoryItem[] = estimates.slice(0, 8).map((estimate) => {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    return {
      id: estimate.id,
      title: estimate.title,
      projectName: project?.project_name ?? "Unknown project",
      customerName: getCustomerName(project),
      grandTotal: getEstimateRevenue(estimate),
      profitMarginPercent: getEstimateMargin(estimate),
      status: estimate.status,
      updatedAt: estimate.updated_at,
    };
  });

  const activity: RecentActivityItem[] = [];

  for (const customer of customers.slice(0, 20)) {
    activity.push({
      id: `customer-${customer.id}`,
      type: "customer",
      action: "Customer added",
      title: customer.company_name,
      subtitle: "New customer record",
      timestamp: customer.created_at,
      href: "/customers",
    });
  }

  for (const project of projects.slice(0, 20)) {
    activity.push({
      id: `project-${project.id}`,
      type: "project",
      action: "Project updated",
      title: project.project_name,
      subtitle: `Status: ${project.status}`,
      timestamp: project.updated_at,
      href: `/projects/${project.id}`,
    });
  }

  for (const estimate of estimates.slice(0, 20)) {
    const project = normalizeRelation<ProjectRow>(estimate.project);
    activity.push({
      id: `estimate-${estimate.id}`,
      type: "estimate",
      action: estimate.status === "Draft" ? "Estimate drafted" : "Estimate updated",
      title: estimate.title,
      subtitle: project?.project_name ?? "Project",
      timestamp: estimate.updated_at,
      href: `/estimates/${estimate.id}`,
    });
  }

  for (const proposal of proposalsFiltered.slice(0, 20)) {
    const project = normalizeRelation<ProjectRow>(proposal.project);
    const action =
      proposal.status === "Accepted"
        ? "Proposal accepted"
        : proposal.status === "Declined"
          ? "Proposal declined"
          : proposal.status === "Sent" || proposal.status === "Viewed"
            ? "Proposal sent"
            : "Proposal updated";

    activity.push({
      id: `proposal-${proposal.id}`,
      type: "proposal",
      action,
      title: proposal.title,
      subtitle: project?.project_name ?? "Project",
      timestamp: proposal.updated_at,
      href: `/proposals/${proposal.id}`,
    });
  }

  const recentActivity = activity
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 12);

  const revenueForecast = buildRevenueForecastInput(
    estimates,
    proposalsFiltered,
    safePercent(acceptedProposals.length, decidedProposals.length),
    average(projectMargins) || grossMarginPercent || TARGET_MARGIN_PERCENT
  );

  const proposalIntelligence = buildProposalIntelligenceInput(
    proposalsFiltered,
    revisionCounts,
    filters.dateRange
  );

  const estimateIntelligence = buildEstimateIntelligenceInput(
    estimates,
    estimateVersionCounts,
    filteredLineItems
  );

  const customerIntelligence = buildCustomerIntelligenceInput(customerStats);

  const portfolioMaterialPercent = safePercent(
    estimates.reduce(
      (sum, estimate) => sum + parseNumber(estimate.materials_total),
      0
    ),
    estimatedTotal
  );

  const aiOpportunities = buildAiOpportunitiesInput(
    estimates,
    proposals,
    projects,
    TARGET_MARGIN_PERCENT,
    grossMarginPercent,
    laborUtilizationPercent,
    portfolioMaterialPercent
  );

  return {
    filters,
    generatedAt: new Date().toISOString(),
    executive: {
      revenue,
      grossProfit,
      grossMarginPercent,
      totalEstimates: estimates.length,
      totalProposals: proposalsFiltered.length,
      winRate: safePercent(acceptedProposals.length, decidedProposals.length),
      activeProjects: projects.filter(
        (project) => project.status !== "Archived" && project.status !== "Lost"
      ).length,
      pipelineValue,
      averageEstimateSize: average(estimateSizes),
      averageProjectMargin: average(projectMargins),
      averageEstimateProductionHours: average(productionHours),
      averageProposalAcceptanceDays: average(acceptanceDays),
    },
    estimating: {
      estimateAccuracyPercent: average(accuracySamples),
      estimatedTotal,
      actualTotal,
      costVariancePercent: safePercent(
        Math.abs(actualTotal - estimatedTotal),
        estimatedTotal
      ),
      laborUtilizationPercent,
      materialCostTrend,
      equipmentCostTrend,
      changeOrderCount,
      costOverrunCount,
      marginByProject,
    },
    proposals: {
      acceptanceRate: safePercent(acceptedProposals.length, decidedProposals.length),
      declineRate: safePercent(declinedProposals.length, decidedProposals.length),
      averageSalesCycleDays: average(salesCycleDays),
      averageProposalValue: average(
        proposalsFiltered.map((proposal) => parseNumber(proposal.amount)).filter((v) => v > 0)
      ),
      revenueWon: revenue,
      revenueLost,
      totalSent: proposalsFiltered.filter(
        (proposal) => proposal.status === "Sent" || Boolean(proposal.sent_at)
      ).length,
      totalDecided: decidedProposals.length,
      proposalVolumeTrend,
    },
    customers: {
      topCustomers,
      revenueByCustomer,
      repeatCustomerRate: safePercent(repeatCustomers, customerEntries.length),
      averageCustomerValue: average(customerValues),
      customerLifetimeValue:
        average(customerValues) * Math.max(1, avgProjectsPerCustomer),
      customerGrowthTrend,
    },
    projects: {
      projectsByStatus,
      revenueByProject,
      profitabilityByProject,
      largestProjects,
      mostProfitableProjects,
    },
    ai: {
      aiGeneratedEstimates: aiEstimateIds.size,
      aiAdoptionRate: safePercent(aiEstimateIds.size, estimates.length),
      estimatedTimeSavedHours,
      recommendationAcceptanceRate: safePercent(
        aiAcceptedEstimateIds.size,
        estimatesWithRecommendations.size
      ),
      averageEstimateCompletionHours: average(productionHours),
      usageByEstimator,
    },
    charts: {
      revenueTrend,
      profitTrend,
      winRateTrend,
      estimateVolumeTrend,
      proposalVolumeTrend,
      projectPipeline: projectsByStatus,
      customerGrowthTrend,
      monthlyRecurringRevenue,
      mrrTrend,
    },
    recentEstimates,
    recentActivity,
    revenueForecast,
    proposalIntelligence,
    estimateIntelligence,
    customerIntelligence,
    aiOpportunities,
  };
}

function buildTimeBucketsWithWinRate(
  proposals: ProposalRow[],
  dateRange: AnalyticsFilters["dateRange"]
) {
  const decided = proposals.filter((proposal) =>
    ["Accepted", "Declined"].includes(proposal.status)
  );

  const buckets = groupByPeriod(
    decided.map((proposal) => ({
      created_at: proposal.decided_at ?? proposal.updated_at,
      value: proposal.status === "Accepted" ? 1 : 0,
      count: 1,
    })),
    dateRange,
    (item) => item.value
  );

  const totalBuckets = groupByPeriod(
    decided.map((proposal) => ({
      created_at: proposal.decided_at ?? proposal.updated_at,
      value: 1,
    })),
    dateRange,
    (item) => item.value
  );

  return buckets.map((bucket, index) => ({
    ...bucket,
    value: safePercent(bucket.value, totalBuckets[index]?.count ?? 0),
  }));
}
