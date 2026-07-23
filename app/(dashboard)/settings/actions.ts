"use server";

import { revalidatePath } from "next/cache";

import {
  assertSafeHttpUrl,
  assertValidEmail,
} from "@/lib/security/url-validation";
import { assertPermission } from "@/lib/auth/get-team-context";
import type { CompanySettingsInput } from "@/lib/company/types";
import { createClient } from "@/lib/supabase/server";

function parseSettingsInput(formData: FormData): CompanySettingsInput {
  return {
    company_name: String(formData.get("company_name") ?? "").trim(),
    company_logo_url: String(formData.get("company_logo_url") ?? "").trim(),
    address_line1: String(formData.get("address_line1") ?? "").trim(),
    address_line2: String(formData.get("address_line2") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
    license_number: String(formData.get("license_number") ?? "").trim(),
    default_terms: String(formData.get("default_terms") ?? "").trim(),
    default_warranty: String(formData.get("default_warranty") ?? "").trim(),
    default_exclusions: String(formData.get("default_exclusions") ?? "").trim(),
    contractor_signature_name: String(formData.get("contractor_signature_name") ?? "").trim(),
    contractor_signature_title: String(formData.get("contractor_signature_title") ?? "").trim(),
  };
}

function nullable(value: string) {
  return value || null;
}

export async function saveCompanySettings(formData: FormData) {
  const context = await assertPermission("settings.company.edit");
  const input = parseSettingsInput(formData);

  if (!input.company_name) {
    return { error: "Enter a company name." };
  }

  const companyLogoUrl = input.company_logo_url
    ? assertSafeHttpUrl(input.company_logo_url)
    : null;

  if (input.company_logo_url && !companyLogoUrl) {
    return { error: "Enter a valid logo link starting with https://." };
  }

  const website = input.website ? assertSafeHttpUrl(input.website) : null;

  if (input.website && !website) {
    return { error: "Enter a valid website starting with https://." };
  }

  const email = input.email ? assertValidEmail(input.email) : null;

  if (input.email && !email) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("company_settings").upsert(
    {
      user_id: context.userId,
      organization_id: context.organizationId,
      company_name: input.company_name,
      company_logo_url: companyLogoUrl,
      address_line1: nullable(input.address_line1),
      address_line2: nullable(input.address_line2),
      city: nullable(input.city),
      state: nullable(input.state),
      zip: nullable(input.zip),
      phone: nullable(input.phone),
      email,
      website: website,
      license_number: nullable(input.license_number),
      default_terms: nullable(input.default_terms),
      default_warranty: nullable(input.default_warranty),
      default_exclusions: nullable(input.default_exclusions),
      contractor_signature_name: nullable(input.contractor_signature_name),
      contractor_signature_title: nullable(input.contractor_signature_title),
    },
    { onConflict: "organization_id" }
  );

  if (error) {
    return {
      error: "We couldn't save your company settings. Try again in a moment.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/proposals");
  return { success: true };
}
