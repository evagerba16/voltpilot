import { createClient } from "@/lib/supabase/server";
import {
  ESTIMATES_PAGE_SIZE,
  type Estimate,
  type EstimateBuilderState,
  type EstimateLineItem,
  type EstimateListItem,
  type EstimateVersion,
  type EstimateWithProject,
} from "@/lib/estimates/types";

type GetEstimatesParams = {
  page?: number;
  search?: string;
  project?: string;
};

type GetEstimatesResult = {
  estimates: EstimateListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

function parseEstimateRecord(estimate: Estimate): Estimate {
  return {
    ...estimate,
    overhead_percent: parseNumber(estimate.overhead_percent),
    contingency_percent: parseNumber(
      estimate.contingency_percent ?? estimate.markup_percent
    ),
    tax_percent: parseNumber(estimate.tax_percent),
    profit_margin_percent: parseNumber(estimate.profit_margin_percent),
    direct_cost_total: parseNumber(estimate.direct_cost_total),
    labor_total: parseNumber(estimate.labor_total),
    materials_total: parseNumber(estimate.materials_total),
    equipment_total: parseNumber(estimate.equipment_total),
    subcontractors_total: parseNumber(estimate.subcontractors_total),
    miscellaneous_total: parseNumber(estimate.miscellaneous_total),
    overhead_amount: parseNumber(estimate.overhead_amount),
    contingency_amount: parseNumber(
      estimate.contingency_amount ?? estimate.markup_amount
    ),
    profit_amount: parseNumber(estimate.profit_amount),
    tax_amount: parseNumber(estimate.tax_amount),
    gross_margin_percent: parseNumber(estimate.gross_margin_percent),
    selling_price: parseNumber(
      estimate.selling_price || estimate.grand_total
    ),
    grand_total: parseNumber(estimate.selling_price || estimate.grand_total),
    last_autosaved_at: estimate.last_autosaved_at ?? null,
  };
}

export async function getEstimates({
  page = 1,
  search = "",
  project,
}: GetEstimatesParams): Promise<GetEstimatesResult> {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * ESTIMATES_PAGE_SIZE;
  const to = from + ESTIMATES_PAGE_SIZE - 1;

  let query = supabase
    .from("estimates")
    .select(
      `
        *,
        project:projects!inner (
          id,
          project_name,
          customer:customers!inner (
            company_name
          )
        )
      `,
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (project?.trim()) {
    query = query.eq("project_id", project.trim());
  }

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const term = `%${escapeIlike(trimmedSearch)}%`;
    query = query.or(`title.ilike.${term},notes.ilike.${term}`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ESTIMATES_PAGE_SIZE));

  return {
    estimates: (data ?? []).map((estimate) =>
      parseEstimateRecord(estimate as Estimate)
    ) as EstimateListItem[],
    total,
    page: currentPage,
    pageSize: ESTIMATES_PAGE_SIZE,
    totalPages,
  };
}

export type ProjectOption = {
  id: string;
  project_name: string;
  customer: {
    company_name: string;
  };
};

export async function getActiveProjectOptions(): Promise<ProjectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
        id,
        project_name,
        customer:customers!inner (
          company_name
        )
      `
    )
    .is("archived_at", null)
    .neq("status", "Archived")
    .order("project_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((project) => {
    const customer = Array.isArray(project.customer)
      ? project.customer[0]
      : project.customer;

    return {
      id: project.id,
      project_name: project.project_name,
      customer: {
        company_name: customer?.company_name ?? "",
      },
    };
  });
}

export async function getEstimateById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select(
      `
        *,
        project:projects!inner (
          id,
          project_name,
          project_address,
          project_type,
          customer:customers!inner (
            company_name,
            contact_name
          )
        )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  const estimate = parseEstimateRecord(data as EstimateWithProject);

  const { data: lineItems, error: lineItemsError } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", id)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (lineItemsError) {
    throw new Error(lineItemsError.message);
  }

  return {
    estimate: {
      ...estimate,
      project: (data as EstimateWithProject).project,
    },
    lineItems: (lineItems ?? []).map((item) => ({
      ...(item as EstimateLineItem),
      quantity: parseNumber(item.quantity),
      unit_cost: parseNumber(item.unit_cost),
    })),
  };
}

export async function getEstimateVersions(
  estimateId: string
): Promise<EstimateVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimate_versions")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("version_number", { ascending: false });

  if (error) {
    if (error.message.includes("estimate_versions")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((version) => ({
    id: version.id,
    estimate_id: version.estimate_id,
    user_id: version.user_id,
    version_number: version.version_number,
    label: version.label,
    snapshot: version.snapshot as EstimateBuilderState,
    created_at: version.created_at,
  }));
}

export async function verifyProjectOwnership(projectId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, project_name")
    .eq("id", projectId)
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .single();

  return error ? null : (data as { id: string; project_name: string });
}

export async function verifyEstimateOwnership(estimateId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("id")
    .eq("id", estimateId)
    .eq("organization_id", organizationId)
    .single();

  return !error && Boolean(data);
}

export function mapEstimateToBuilderState(
  estimate: Estimate,
  lineItems: EstimateLineItem[]
): EstimateBuilderState {
  return {
    title: estimate.title,
    notes: estimate.notes ?? "",
    overhead_percent: parseNumber(estimate.overhead_percent),
    contingency_percent: parseNumber(
      estimate.contingency_percent ?? estimate.markup_percent
    ),
    tax_percent: parseNumber(estimate.tax_percent),
    profit_margin_percent: parseNumber(estimate.profit_margin_percent),
    line_items: lineItems.map((item) => ({
      id: item.id,
      category: item.category,
      description: item.description,
      quantity: parseNumber(item.quantity),
      unit: item.unit,
      unit_cost: parseNumber(item.unit_cost),
      sort_order: item.sort_order,
    })),
  };
}
