import { buildCustomerAiInsights } from "@/lib/customers/insights";
import { buildCustomerTimeline } from "@/lib/customers/timeline";
import {
  CUSTOMERS_PAGE_SIZE,
  CUSTOMER_NOTES_FILTERS,
  CUSTOMER_PROJECT_FILTERS,
  CUSTOMER_SORT_FIELDS,
  CUSTOMER_STATUS_FILTERS,
  OPEN_PROPOSAL_STATUSES,
  type Customer,
  type CustomerDocument,
  type CustomerEstimateSummary,
  type CustomerListItem,
  type CustomerNote,
  type CustomerNotesFilter,
  type CustomerProfile,
  type CustomerProfileSummary,
  type CustomerProjectFilter,
  type CustomerProjectSummary,
  type CustomerProposalSummary,
  type CustomerSortField,
  type CustomerStatusFilter,
  type SortOrder,
} from "@/lib/customers/types";
import { createClient } from "@/lib/supabase/server";

type GetCustomersParams = {
  page?: number;
  search?: string;
  sort?: string;
  order?: string;
  projects?: string;
  notes?: string;
  status?: string;
};

type GetCustomersResult = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ListMetrics = {
  projectCount: number;
  activeProjectCount: number;
  totalRevenue: number;
  lastActivityAt: string | null;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseSortField(value: string | undefined): CustomerSortField {
  if (value && CUSTOMER_SORT_FIELDS.includes(value as CustomerSortField)) {
    return value as CustomerSortField;
  }

  return "company_name";
}

function parseSortOrder(value: string | undefined): SortOrder {
  return value === "desc" ? "desc" : "asc";
}

function parseProjectFilter(value: string | undefined): CustomerProjectFilter {
  if (
    value &&
    CUSTOMER_PROJECT_FILTERS.some((option) => option.value === value)
  ) {
    return value as CustomerProjectFilter;
  }

  return "all";
}

function parseNotesFilter(value: string | undefined): CustomerNotesFilter {
  if (value && CUSTOMER_NOTES_FILTERS.some((option) => option.value === value)) {
    return value as CustomerNotesFilter;
  }

  return "all";
}

function parseStatusFilter(value: string | undefined): CustomerStatusFilter {
  if (value && CUSTOMER_STATUS_FILTERS.some((option) => option.value === value)) {
    return value as CustomerStatusFilter;
  }

  return "all";
}

function parseNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function maxTimestamp(...values: Array<string | null | undefined>) {
  const timestamps = values.filter(Boolean) as string[];
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.sort(
    (left, right) => new Date(right).getTime() - new Date(left).getTime()
  )[0];
}

async function getCustomerIdsWithProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("customer_id")
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.customer_id))];
}

async function getCustomerIdsWithCrmNotes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_notes").select("customer_id");

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.customer_id))];
}

async function getListMetricsByCustomerId(
  customerIds: string[]
): Promise<Map<string, ListMetrics>> {
  const metrics = new Map<string, ListMetrics>();

  if (customerIds.length === 0) {
    return metrics;
  }

  const supabase = await createClient();

  for (const customerId of customerIds) {
    metrics.set(customerId, {
      projectCount: 0,
      activeProjectCount: 0,
      totalRevenue: 0,
      lastActivityAt: null,
    });
  }

  const [
    projectsResult,
    notesResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, customer_id, status, estimated_value, updated_at, created_at")
      .in("customer_id", customerIds)
      .is("archived_at", null),
    supabase
      .from("customer_notes")
      .select("customer_id, created_at")
      .in("customer_id", customerIds),
    supabase
      .from("customer_documents")
      .select("customer_id, created_at")
      .in("customer_id", customerIds),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (notesResult.error) throw new Error(notesResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const projectIds = (projectsResult.data ?? []).map((project) => project.id);
  let proposalsResult: {
    data: Array<{
      amount: number | null;
      accepted_at: string | null;
      sent_at: string | null;
      updated_at: string | null;
      created_at: string;
      status: string;
      project_id: string;
    }> | null;
    error: { message: string } | null;
  } = { data: [], error: null };

  if (projectIds.length > 0) {
    proposalsResult = await supabase
      .from("proposals")
      .select("amount, accepted_at, sent_at, updated_at, created_at, status, project_id")
      .in("project_id", projectIds);
  }

  const projectCustomerMap = new Map(
    (projectsResult.data ?? []).map((project) => [project.id, project.customer_id])
  );

  for (const project of projectsResult.data ?? []) {
    const entry = metrics.get(project.customer_id);
    if (!entry) continue;

    entry.projectCount += 1;
    if (!["Lost", "Archived"].includes(project.status)) {
      entry.activeProjectCount += 1;
      entry.totalRevenue += parseNumber(project.estimated_value);
    }

    entry.lastActivityAt = maxTimestamp(
      entry.lastActivityAt,
      project.updated_at,
      project.created_at
    );
  }

  for (const note of notesResult.data ?? []) {
    const entry = metrics.get(note.customer_id);
    if (!entry) continue;
    entry.lastActivityAt = maxTimestamp(entry.lastActivityAt, note.created_at);
  }

  for (const document of documentsResult.data ?? []) {
    const entry = metrics.get(document.customer_id);
    if (!entry) continue;
    entry.lastActivityAt = maxTimestamp(entry.lastActivityAt, document.created_at);
  }

  if (!proposalsResult.error) {
    for (const proposal of proposalsResult.data ?? []) {
      const customerId = projectCustomerMap.get(proposal.project_id);
      if (!customerId) continue;

      const entry = metrics.get(customerId);
      if (!entry) continue;

      if (proposal.status === "Accepted") {
        entry.totalRevenue += parseNumber(proposal.amount);
      }

      entry.lastActivityAt = maxTimestamp(
        entry.lastActivityAt,
        proposal.accepted_at,
        proposal.sent_at,
        proposal.updated_at,
        proposal.created_at
      );
    }
  }

  return metrics;
}

export async function getCustomers({
  page = 1,
  search = "",
  sort,
  order,
  projects,
  notes,
  status,
}: GetCustomersParams): Promise<GetCustomersResult> {
  const supabase = await createClient();
  const sortField = parseSortField(sort);
  const sortOrder = parseSortOrder(order);
  const projectFilter = parseProjectFilter(projects);
  const notesFilter = parseNotesFilter(notes);
  const statusFilter = parseStatusFilter(status);
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order(sortField, { ascending: sortOrder === "asc" });

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const term = `%${escapeIlike(trimmedSearch)}%`;
    query = query.or(
      `company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone_number.ilike.${term},project_address.ilike.${term}`
    );
  }

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (notesFilter === "with_notes") {
    const customerIdsWithNotes = await getCustomerIdsWithCrmNotes();
    if (customerIdsWithNotes.length === 0) {
      return {
        customers: [],
        total: 0,
        page: currentPage,
        pageSize: CUSTOMERS_PAGE_SIZE,
        totalPages: 1,
      };
    }
    query = query.in("id", customerIdsWithNotes);
  }

  if (notesFilter === "without_notes") {
    const customerIdsWithNotes = await getCustomerIdsWithCrmNotes();
    if (customerIdsWithNotes.length > 0) {
      query = query.not("id", "in", `(${customerIdsWithNotes.join(",")})`);
    }
  }

  if (projectFilter !== "all") {
    const customerIdsWithProjects = await getCustomerIdsWithProjects();

    if (projectFilter === "with_projects") {
      if (customerIdsWithProjects.length === 0) {
        return {
          customers: [],
          total: 0,
          page: currentPage,
          pageSize: CUSTOMERS_PAGE_SIZE,
          totalPages: 1,
        };
      }

      query = query.in("id", customerIdsWithProjects);
    } else if (customerIdsWithProjects.length > 0) {
      query = query.not("id", "in", `(${customerIdsWithProjects.join(",")})`);
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const customers = (data ?? []) as Customer[];
  const listMetrics = await getListMetricsByCustomerId(
    customers.map((customer) => customer.id)
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));

  return {
    customers: customers.map((customer) => {
      const metric = listMetrics.get(customer.id);
      return {
        ...customer,
        status: customer.status ?? "lead",
        project_count: metric?.projectCount ?? 0,
        active_project_count: metric?.activeProjectCount ?? 0,
        total_revenue: metric?.totalRevenue ?? 0,
        last_activity_at: metric?.lastActivityAt ?? customer.updated_at,
      };
    }),
    total,
    page: currentPage,
    pageSize: CUSTOMERS_PAGE_SIZE,
    totalPages,
  };
}

export async function getCustomerById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { ...(data as Customer), status: (data as Customer).status ?? "lead" };
}

function normalizeRelation<T>(value: unknown): T | undefined {
  if (Array.isArray(value)) {
    return value[0] as T | undefined;
  }

  return value as T | undefined;
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const supabase = await createClient();
  const customer = await getCustomerById(id);

  if (!customer) {
    return null;
  }

  const [projectsResult, notesResult, documentsResult, teamResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, project_name, status, estimated_value, updated_at, created_at")
        .eq("customer_id", id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("customer_notes")
        .select("*")
        .eq("customer_id", id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("customer_documents")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("team_members")
        .select("user_id, display_name, email")
        .eq("status", "active"),
    ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (notesResult.error) throw new Error(notesResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const authorNames = new Map<string, string>();
  for (const member of teamResult.data ?? []) {
    authorNames.set(
      member.user_id,
      member.display_name?.trim() || member.email || "Team member"
    );
  }

  const notes = ((notesResult.data ?? []) as CustomerNote[]).map((note) => ({
    ...note,
    is_pinned: note.is_pinned ?? false,
    author_name: authorNames.get(note.user_id) ?? "Team member",
  }));

  const documents = ((documentsResult.data ?? []) as CustomerDocument[]).map(
    (document) => ({
      ...document,
      category: document.category ?? "other",
    })
  );

  const projects = (projectsResult.data ?? []).map((project) => ({
    id: project.id,
    project_name: project.project_name,
    status: project.status,
    estimated_value: project.estimated_value,
    updated_at: project.updated_at ?? project.created_at,
  })) as CustomerProjectSummary[];

  const projectIds = projects.map((project) => project.id);
  let proposals: Array<{
    id: string;
    title: string;
    status: string;
    amount: number | null;
    sent_at: string | null;
    accepted_at: string | null;
    first_viewed_at: string | null;
    created_at: string;
    updated_at: string;
    project: { project_name?: string } | Array<{ project_name?: string }> | null;
  }> = [];

  let proposalViews: Array<{
    id: string;
    proposal_id: string;
    viewed_at: string;
    proposal: { title?: string } | Array<{ title?: string }> | null;
  }> = [];

  let estimates: CustomerEstimateSummary[] = [];

  if (projectIds.length > 0) {
    const [proposalRows, estimateRows] = await Promise.all([
      supabase
        .from("proposals")
        .select(
          `
          id, title, status, amount, sent_at, accepted_at, first_viewed_at, created_at, updated_at,
          project:projects (project_name, status)
        `
        )
        .in("project_id", projectIds)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("estimates")
        .select(
          `
          id, title, status, grand_total, updated_at, created_at,
          project:projects (project_name)
        `
        )
        .in("project_id", projectIds)
        .order("updated_at", { ascending: false })
        .limit(30),
    ]);

    if (proposalRows.error && !proposalRows.error.message.includes("proposals")) {
      throw new Error(proposalRows.error.message);
    }

    proposals = (proposalRows.data ?? []) as typeof proposals;

    if (!estimateRows.error) {
      estimates = (estimateRows.data ?? []).map((estimate) => {
        const project = normalizeRelation<{ project_name?: string }>(estimate.project);
        return {
          id: estimate.id,
          title: estimate.title,
          status: estimate.status,
          grand_total: estimate.grand_total,
          project_name: project?.project_name ?? "Project",
          updated_at: estimate.updated_at ?? estimate.created_at,
        };
      });
    }

    const proposalIds = proposals.map((proposal) => proposal.id);
    if (proposalIds.length > 0) {
      const { data: viewRows } = await supabase
        .from("proposal_views")
        .select(
          `
          id, proposal_id, viewed_at,
          proposal:proposals (title)
        `
        )
        .in("proposal_id", proposalIds)
        .order("viewed_at", { ascending: false })
        .limit(20);

      proposalViews = (viewRows ?? []) as typeof proposalViews;
    }
  }

  const openProposals = proposals
    .filter((proposal) =>
      OPEN_PROPOSAL_STATUSES.includes(
        proposal.status as (typeof OPEN_PROPOSAL_STATUSES)[number]
      )
    )
    .map((proposal) => {
      const project = normalizeRelation<{ project_name?: string }>(proposal.project);
      return {
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        amount: proposal.amount,
        project_name: project?.project_name ?? "Project",
        sent_at: proposal.sent_at,
        updated_at: proposal.updated_at ?? proposal.created_at,
      };
    }) as CustomerProposalSummary[];

  const openEstimates = estimates.filter((estimate) => estimate.status === "Draft");

  const acceptedProposals = proposals.filter(
    (proposal) => proposal.status === "Accepted"
  );
  const totalRevenue = acceptedProposals.reduce(
    (sum, proposal) => sum + parseNumber(proposal.amount),
    0
  );
  const closedProjectStatuses = new Set(["Completed", "Lost", "Archived"]);
  const openContractValue = acceptedProposals.reduce((sum, proposal) => {
    const project = normalizeRelation<{ project_name?: string; status?: string }>(
      proposal.project
    );
    if (project?.status && closedProjectStatuses.has(project.status)) {
      return sum;
    }
    return sum + parseNumber(proposal.amount);
  }, 0);
  const activeProjectCount = projects.filter(
    (project) => !["Lost", "Archived"].includes(project.status)
  ).length;

  const lastActivityAt = maxTimestamp(
    customer.updated_at,
    ...notes.map((note) => note.created_at),
    ...documents.map((document) => document.created_at),
    ...projects.map((project) => project.updated_at),
    ...proposals.flatMap((proposal) => [
      proposal.updated_at,
      proposal.sent_at,
      proposal.accepted_at,
      proposal.first_viewed_at,
    ]),
    ...proposalViews.map((view) => view.viewed_at)
  );

  const summary: CustomerProfileSummary = {
    totalRevenue,
    activeProjectCount,
    openEstimateCount: openEstimates.length,
    openProposalCount: openProposals.length,
    openContractValue,
    lastActivityAt,
  };

  const { count: projectCount, error: projectCountError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
    .is("archived_at", null);

  if (projectCountError) {
    throw new Error(projectCountError.message);
  }

  const timeline = buildCustomerTimeline({
    customer,
    notes,
    documents,
    projects,
    proposals,
    proposalViews,
    estimates,
  });

  const profile: CustomerProfile = {
    customer,
    summary,
    projectCount: projectCount ?? projects.length,
    projects,
    openEstimates,
    openProposals,
    notes,
    documents,
    timeline,
    aiInsights: [],
  };

  profile.aiInsights = buildCustomerAiInsights(profile);

  return profile;
}

export async function getCustomerNotes(customerId: string) {
  const profile = await getCustomerProfile(customerId);
  return profile?.notes ?? [];
}

export async function getCustomerDocuments(customerId: string) {
  const profile = await getCustomerProfile(customerId);
  return profile?.documents ?? [];
}

export async function createSignedCustomerDocumentUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("customer-documents")
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
