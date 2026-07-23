import type { CompanySettings } from "@/lib/company/types";

export function formatCompanyAddress(settings: CompanySettings) {
  const lines = [
    settings.address_line1,
    settings.address_line2,
    [settings.city, settings.state, settings.zip].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];

  return lines;
}

export function companySettingsToSnapshot(settings: CompanySettings) {
  return {
    company_name: settings.company_name,
    company_logo_url: settings.company_logo_url,
    address_lines: formatCompanyAddress(settings),
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    license_number: settings.license_number,
    branding: {
      primary_color: "#1e3a5f",
      accent_color: "#0ea5e9",
      customer_logo_url: null,
    },
  };
}
