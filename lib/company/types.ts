export type CompanySettings = {
  user_id: string;
  organization_id?: string | null;
  company_name: string;
  company_logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  default_terms: string | null;
  default_warranty: string | null;
  default_exclusions: string | null;
  contractor_signature_name: string | null;
  contractor_signature_title: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanySettingsInput = {
  company_name: string;
  company_logo_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  license_number: string;
  default_terms: string;
  default_warranty: string;
  default_exclusions: string;
  contractor_signature_name: string;
  contractor_signature_title: string;
};

export const DEFAULT_COMPANY_NAME = "Your Company";

export const DEFAULT_TERMS = `Payment terms are net 30 days from invoice date unless otherwise agreed in writing. This proposal is valid for 30 days from the proposal date. Work will commence upon receipt of signed proposal and any required deposits.`;

export const DEFAULT_WARRANTY = `All workmanship is warranted for one (1) year from substantial completion. Manufacturer warranties apply to furnished equipment and materials. Warranty excludes damage caused by others, misuse, or modifications not performed by the contractor.`;

export const DEFAULT_EXCLUSIONS = `Proposal excludes permits unless noted, utility coordination, asbestos abatement, hazardous material remediation, work outside normal business hours, and items not specifically listed in the scope of work.`;
