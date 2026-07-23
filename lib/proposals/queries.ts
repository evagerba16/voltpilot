import { createClient } from "@/lib/supabase/server";
import { parseNumber } from "@/lib/proposals/format";
import {
  PROPOSALS_PAGE_SIZE,
  type Proposal,
  type ProposalEditorState,
  type ProposalEstimateSnapshot,
  type ProposalListItem,
  type ProposalSortField,
  type ProposalWithRelations,
} from "@/lib/proposals/types";

type GetProposalsParams = {
  page?: number;
  search?: string;
  status?: string;
  project?: string;
  sort?: string;
  order?: string;
  includeArchived?: boolean;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseProposalRecord(proposal: Proposal): Proposal {
  return {
    ...proposal,
    amount: parseNumber(proposal.amount),
    estimate_snapshot: proposal.estimate_snapshot as ProposalEstimateSnapshot | null,
  };
}

function normalizeCustomer(customer: unknown) {
  if (Array.isArray(customer)) {
    return customer[0];
  }

  return customer;
}

function normalizeEstimate(estimate: unknown) {
  if (!estimate) {
    return null;
  }

  if (Array.isArray(estimate)) {
    return estimate[0] ?? null;
  }

  return estimate;
}

export async function getProposals({
  page = 1,
  search = "",
  status = "",
  project = "",
  sort = "created_at",
  order = "desc",
  includeArchived = false,
}: GetProposalsParams) {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * PROPOSALS_PAGE_SIZE;
  const to = from + PROPOSALS_PAGE_SIZE - 1;
  const sortField = (["proposal_date", "amount", "status", "created_at"].includes(sort)
    ? sort
    : "created_at") as ProposalSortField;

  let query = supabase
    .from("proposals")
    .select(
      `
        *,
        project:projects!inner (
          id,
          project_name,
          customer:customers!inner (
            company_name
          )
        ),
        estimate:estimates (
          id,
          title
        )
      `,
      { count: "exact" }
    )
    .order(sortField, { ascending: order === "asc" })
    .range(from, to);

  if (status.trim()) {
    query = query.eq("status", status.trim());
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  if (project.trim()) {
    query = query.eq("project_id", project.trim());
  }

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const term = `%${escapeIlike(trimmedSearch)}%`;
    query = query.or(
      `title.ilike.${term},proposal_number.ilike.${term},scope_of_work.ilike.${term},notes.ilike.${term}`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PROPOSALS_PAGE_SIZE));

  return {
    proposals: (data ?? []).map((proposal) => {
      const mapped = parseProposalRecord(proposal as Proposal);
      return {
        ...mapped,
        project: {
          id: proposal.project.id,
          project_name: proposal.project.project_name,
          customer: normalizeCustomer(proposal.project.customer),
        },
        estimate: normalizeEstimate(proposal.estimate),
      } as ProposalListItem;
    }),
    total,
    page: currentPage,
    pageSize: PROPOSALS_PAGE_SIZE,
    totalPages,
  };
}

export async function getProposalById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select(
      `
        *,
        project:projects!inner (
          id,
          project_name,
          project_address,
          project_type,
          general_contractor,
          bid_due_date,
          customer:customers!inner (
            id,
            company_name,
            contact_name,
            email,
            phone_number,
            project_address
          )
        ),
        estimate:estimates (
          id,
          title
        )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  const mapped = parseProposalRecord(data as Proposal);

  return {
    ...mapped,
    project: {
      ...data.project,
      customer: normalizeCustomer(data.project.customer),
    },
    estimate: normalizeEstimate(data.estimate),
  } as ProposalWithRelations;
}

export async function verifyProposalOwnership(proposalId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("id")
    .eq("id", proposalId)
    .eq("organization_id", organizationId)
    .single();

  return !error && Boolean(data);
}

export type EstimateOption = {
  id: string;
  title: string;
  selling_price: number;
  project: {
    id: string;
    project_name: string;
    customer: {
      company_name: string;
    };
  };
};

export async function getEstimateOptionsForProposals(): Promise<EstimateOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select(
      `
        id,
        title,
        selling_price,
        grand_total,
        project:projects!inner (
          id,
          project_name,
          customer:customers!inner (
            company_name
          )
        )
      `
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((estimate) => {
    const project = Array.isArray(estimate.project)
      ? estimate.project[0]
      : estimate.project;

    return {
      id: estimate.id,
      title: estimate.title,
      selling_price: parseNumber(estimate.selling_price ?? estimate.grand_total),
      project: {
        id: project.id,
        project_name: project.project_name,
        customer: normalizeCustomer(project.customer),
      },
    };
  });
}

export function editorStateToRecord(state: ProposalEditorState) {
  return {
    title: state.title,
    proposal_date: state.proposal_date,
    expiration_date: state.expiration_date || null,
    scope_of_work: state.scope_of_work || null,
    materials_summary: state.materials_summary || null,
    labor_summary: state.labor_summary || null,
    equipment_summary: state.equipment_summary || null,
    show_line_item_breakdown: state.show_line_item_breakdown,
    assumptions: state.assumptions || null,
    exclusions: state.exclusions || null,
    terms_and_conditions: state.terms_and_conditions || null,
    warranty_information: state.warranty_information || null,
    customer_signature_name: state.customer_signature_name || null,
    customer_signature_title: state.customer_signature_title || null,
    contractor_signature_name: state.contractor_signature_name || null,
    contractor_signature_title: state.contractor_signature_title || null,
    notes: state.notes || null,
    internal_notes: state.internal_notes || null,
  };
}

export async function getProposalStats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("status, amount");

  if (error) {
    throw new Error(error.message);
  }

  const proposals = data ?? [];
  const draft = proposals.filter((item) => item.status === "Draft").length;
  const sent = proposals.filter((item) => ["Sent", "Viewed"].includes(item.status)).length;
  const accepted = proposals.filter((item) => item.status === "Accepted").length;
  const pipeline = proposals
    .filter((item) => ["Draft", "Sent", "Viewed"].includes(item.status))
    .reduce((sum, item) => sum + parseNumber(item.amount), 0);

  return { draft, sent, won: accepted, accepted, pipeline };
}
