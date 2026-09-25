import { DEFAULT_COMPANY_NAME } from "@/lib/company/types";

/**
 * Canonical branding name lives in `company_settings.company_name`.
 * `organizations.name` is kept in sync when an owner saves company settings (team/billing labels).
 */
export function resolveOrganizationDisplayName(
  settingsCompanyName: string,
  organizationName: string
): string {
  const trimmedSettings = settingsCompanyName.trim();

  if (trimmedSettings && trimmedSettings !== DEFAULT_COMPANY_NAME) {
    return trimmedSettings;
  }

  const trimmedOrganization = organizationName.trim();

  if (trimmedOrganization) {
    return trimmedOrganization;
  }

  return DEFAULT_COMPANY_NAME;
}

export function isConfiguredOrganizationDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return Boolean(trimmed && trimmed !== DEFAULT_COMPANY_NAME);
}
