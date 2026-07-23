import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMERS_PAGE_SIZE,
  CUSTOMER_SORT_FIELDS,
  type Customer,
  type CustomerSortField,
  type SortOrder,
} from "@/lib/customers/types";

type GetCustomersParams = {
  page?: number;
  search?: string;
  sort?: string;
  order?: string;
};

type GetCustomersResult = {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export async function getCustomers({
  page = 1,
  search = "",
  sort,
  order,
}: GetCustomersParams): Promise<GetCustomersResult> {
  const supabase = await createClient();
  const sortField = parseSortField(sort);
  const sortOrder = parseSortOrder(order);
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order(sortField, { ascending: sortOrder === "asc" })
    .range(from, to);

  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const term = `%${escapeIlike(trimmedSearch)}%`;
    query = query.or(
      `company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone_number.ilike.${term}`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));

  return {
    customers: (data ?? []) as Customer[],
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
    .single();

  if (error) {
    return null;
  }

  return data as Customer;
}
