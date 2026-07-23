import { createClient } from "@/lib/supabase/server";
import { mapProjectRow, parseNumber } from "@/lib/projects/format";
import {
  PROJECTS_PAGE_SIZE,
  PROJECT_SORT_FIELDS,
  PROJECT_STATUSES,
  type ProjectArchiveFilter,
  type ProjectSortField,
  type ProjectStatus,
  type ProjectWithCustomer,
  type SortOrder,
} from "@/lib/projects/types";

type GetProjectsParams = {
  page?: number;
  search?: string;
  sort?: string;
  order?: string;
  view?: ProjectArchiveFilter;
  status?: string;
  type?: string;
  customer?: string;
};

type GetProjectsResult = {
  projects: ProjectWithCustomer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseSortField(value: string | undefined): ProjectSortField {
  if (value && PROJECT_SORT_FIELDS.includes(value as ProjectSortField)) {
    return value as ProjectSortField;
  }

  return "created_at";
}

function parseSortOrder(value: string | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function parseArchiveFilter(value: string | undefined): ProjectArchiveFilter {
  if (value === "archived" || value === "all") {
    return value;
  }

  return "active";
}

function parseStatusFilter(value: string | undefined): ProjectStatus | null {
  if (value && PROJECT_STATUSES.includes(value as ProjectStatus)) {
    return value as ProjectStatus;
  }

  return null;
}

async function getMatchingCustomerIds(search: string) {
  const supabase = await createClient();
  const term = `%${escapeIlike(search)}%`;
  const { data } = await supabase
    .from("customers")
    .select("id")
    .ilike("company_name", term);

  return (data ?? []).map((customer) => customer.id);
}

function normalizeCustomer(customer: unknown) {
  if (Array.isArray(customer)) {
    return customer[0] as ProjectWithCustomer["customer"] | undefined;
  }

  return customer as ProjectWithCustomer["customer"] | undefined;
}

export async function getProjects({
  page = 1,
  search = "",
  sort,
  order,
  view,
  status,
  type,
  customer,
}: GetProjectsParams): Promise<GetProjectsResult> {
  const supabase = await createClient();
  const sortField = parseSortField(sort);
  const sortOrder = parseSortOrder(order);
  const archiveFilter = parseArchiveFilter(view);
  const statusFilter = parseStatusFilter(status);
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * PROJECTS_PAGE_SIZE;
  const to = from + PROJECTS_PAGE_SIZE - 1;

  let query = supabase
    .from("projects")
    .select(
      `
        *,
        customer:customers!inner (
          id,
          company_name,
          contact_name,
          email
        )
      `,
      { count: "exact" }
    )
    .order(sortField, { ascending: sortOrder === "asc" })
    .range(from, to);

  if (archiveFilter === "active") {
    query = query.neq("status", "Archived").is("archived_at", null);
  } else if (archiveFilter === "archived") {
    query = query.or("status.eq.Archived,archived_at.not.is.null");
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (type?.trim()) {
    query = query.eq("project_type", type.trim());
  }

  if (customer?.trim()) {
    query = query.eq("customer_id", customer.trim());
  }

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const term = `%${escapeIlike(trimmedSearch)}%`;
    const customerIds = await getMatchingCustomerIds(trimmedSearch);
    const projectFilters = [
      `project_name.ilike.${term}`,
      `project_address.ilike.${term}`,
      `project_type.ilike.${term}`,
      `general_contractor.ilike.${term}`,
      `assigned_estimator.ilike.${term}`,
      `notes.ilike.${term}`,
      `status.ilike.${term}`,
    ];

    if (customerIds.length > 0) {
      projectFilters.push(`customer_id.in.(${customerIds.join(",")})`);
    }

    query = query.or(projectFilters.join(","));
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PROJECTS_PAGE_SIZE));

  return {
    projects: (data ?? []).map((project) => {
      const mapped = mapProjectRow(project) as ProjectWithCustomer;
      return {
        ...mapped,
        customer: normalizeCustomer(project.customer)!,
      };
    }),
    total,
    page: currentPage,
    pageSize: PROJECTS_PAGE_SIZE,
    totalPages,
  };
}

export type CustomerOption = {
  id: string;
  company_name: string;
};

export async function getCustomerOptions(): Promise<CustomerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, company_name")
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomerOption[];
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
        *,
        customer:customers!inner (
          id,
          company_name,
          contact_name,
          email,
          phone_number
        )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  const mapped = mapProjectRow(data) as ProjectWithCustomer & {
    customer: ProjectWithCustomer["customer"] & { phone_number?: string | null };
  };

  return {
    ...mapped,
    customer: normalizeCustomer(data.customer)!,
  };
}

export async function getProjectEstimates(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id, title, status, selling_price, grand_total, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.message.includes("estimates")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((estimate) => ({
    id: estimate.id,
    title: estimate.title,
    status: estimate.status,
    total: parseNumber(estimate.selling_price ?? estimate.grand_total),
    updated_at: estimate.updated_at,
  }));
}

export async function getProjectStats() {
  const supabase = await createClient();

  const [projectsResult, estimatesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("status, estimated_value, archived_at")
      .is("archived_at", null)
      .neq("status", "Archived"),
    supabase.from("estimates").select("status, profit_margin_percent"),
  ]);

  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }

  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }

  const projects = projectsResult.data ?? [];
  const estimates = estimatesResult.data ?? [];

  const activeProjects = projects.length;
  const estimatingProjects = projects.filter(
    (project) => project.status === "Estimating"
  ).length;
  const proposalsSent = projects.filter(
    (project) => project.status === "Proposal Sent"
  ).length;
  const awardedProjects = projects.filter(
    (project) => project.status === "Awarded"
  ).length;

  const contractValues = projects
    .map((project) => parseNumber(project.estimated_value))
    .filter((value) => value > 0);

  const estimatedRevenue = contractValues.reduce((sum, value) => sum + value, 0);

  const margins = estimates
    .map((estimate) => parseNumber(estimate.profit_margin_percent))
    .filter((value) => value > 0);

  const averageMargin =
    margins.length > 0
      ? margins.reduce((sum, value) => sum + value, 0) / margins.length
      : 0;

  const draftEstimates = estimates.filter(
    (estimate) => estimate.status === "Draft"
  ).length;

  return {
    activeProjects,
    estimatingProjects,
    proposalsSent,
    awardedProjects,
    estimatedRevenue,
    averageMargin,
    draftEstimates,
  };
}

export async function getRecentProjects(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
        id,
        project_name,
        status,
        updated_at,
        customer:customers!inner (
          company_name
        )
      `
    )
    .is("archived_at", null)
    .neq("status", "Archived")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((project) => ({
    id: project.id,
    project_name: project.project_name,
    status: project.status,
    updated_at: project.updated_at,
    customer_name: normalizeCustomer(project.customer)?.company_name ?? "",
  }));
}

export async function verifyProjectOwnership(projectId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organization_id", organizationId)
    .single();

  return !error && Boolean(data);
}
