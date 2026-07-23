export type Customer = {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string | null;
  project_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  project_address: string;
  notes: string;
};

export type CustomerSortField =
  | "company_name"
  | "contact_name"
  | "email"
  | "created_at";

export type SortOrder = "asc" | "desc";

export const CUSTOMER_SORT_FIELDS: CustomerSortField[] = [
  "company_name",
  "contact_name",
  "email",
  "created_at",
];

export const CUSTOMERS_PAGE_SIZE = 10;
