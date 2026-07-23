import { getUserFirstName } from "@/lib/auth/display-name";
import { DEFAULT_COMPANY_NAME } from "@/lib/company/types";

import type { User } from "@supabase/supabase-js";

type ResolveDashboardHeaderLabelInput = {
  companyName?: string | null;
  organizationName?: string | null;
  user?: User | null;
};

function isConfiguredCompanyName(name?: string | null) {
  const trimmed = name?.trim();
  return Boolean(trimmed && trimmed !== DEFAULT_COMPANY_NAME);
}

export function resolveDashboardHeaderLabel({
  companyName,
  organizationName,
  user,
}: ResolveDashboardHeaderLabelInput) {
  if (isConfiguredCompanyName(companyName)) {
    return companyName!.trim();
  }

  if (isConfiguredCompanyName(organizationName)) {
    return organizationName!.trim();
  }

  const firstName = getUserFirstName(user);
  if (firstName) {
    return `Welcome back, ${firstName}`;
  }

  return "Welcome to VoltPilot";
}
