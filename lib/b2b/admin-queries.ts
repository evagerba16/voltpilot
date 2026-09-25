import type { CompanyQuoteRequest, ContractorCountRange } from "@/lib/b2b/types";
import { createAdminClient } from "@/lib/supabase/admin-cli";

type QuoteRow = {
  id: string;
  company_name: string;
  contact_name: string;
  work_email: string;
  phone: string | null;
  contractor_count_range: ContractorCountRange;
  goals: string;
  status: CompanyQuoteRequest["status"];
  organization_id: string | null;
  owner_email: string | null;
  provisioned_at: string | null;
  provisioned_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapQuoteRow(row: QuoteRow): CompanyQuoteRequest & {
  organizationId: string | null;
  ownerEmail: string | null;
  provisionedAt: string | null;
  provisionedBy: string | null;
} {
  return {
    id: row.id,
    company_name: row.company_name,
    contact_name: row.contact_name,
    work_email: row.work_email,
    phone: row.phone,
    contractor_count_range: row.contractor_count_range,
    goals: row.goals,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    organizationId: row.organization_id,
    ownerEmail: row.owner_email,
    provisionedAt: row.provisioned_at,
    provisionedBy: row.provisioned_by,
  };
}

export async function listCompanyQuoteRequests(options?: {
  status?: CompanyQuoteRequest["status"];
  limit?: number;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("company_quote_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as QuoteRow[]).map(mapQuoteRow);
}

export async function getCompanyQuoteRequestById(quoteRequestId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_quote_requests")
    .select("*")
    .eq("id", quoteRequestId.trim())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapQuoteRow(data as QuoteRow);
}
