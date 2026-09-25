export const CONTRACTOR_COUNT_RANGES = [
  "1-5",
  "6-15",
  "16-30",
  "31-50",
  "51+",
] as const;

export type ContractorCountRange = (typeof CONTRACTOR_COUNT_RANGES)[number];

export const CONTRACTOR_COUNT_RANGE_LABELS: Record<ContractorCountRange, string> = {
  "1-5": "1–5 contractors",
  "6-15": "6–15 contractors",
  "16-30": "16–30 contractors",
  "31-50": "31–50 contractors",
  "51+": "51+ contractors",
};

export type CompanyQuoteRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  work_email: string;
  phone: string | null;
  contractor_count_range: ContractorCountRange;
  goals: string;
  status: "pending" | "reviewed" | "provisioned" | "declined";
  created_at: string;
  updated_at: string;
};
