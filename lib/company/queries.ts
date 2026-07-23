import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_EXCLUSIONS,
  DEFAULT_TERMS,
  DEFAULT_WARRANTY,
  type CompanySettings,
} from "@/lib/company/types";

export function getDefaultCompanySettings(
  userId: string,
  organizationId?: string
): CompanySettings {
  return {
    user_id: userId,
    organization_id: organizationId ?? null,
    company_name: DEFAULT_COMPANY_NAME,
    company_logo_url: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    zip: null,
    phone: null,
    email: null,
    website: null,
    license_number: null,
    default_terms: DEFAULT_TERMS,
    default_warranty: DEFAULT_WARRANTY,
    default_exclusions: DEFAULT_EXCLUSIONS,
    contractor_signature_name: null,
    contractor_signature_title: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getCompanySettings(
  organizationId: string,
  userId?: string
): Promise<CompanySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("company_settings")) {
      return getDefaultCompanySettings(userId ?? "", organizationId);
    }

    throw new Error(error.message);
  }

  if (!data) {
    return getDefaultCompanySettings(userId ?? "", organizationId);
  }

  return data as CompanySettings;
}
