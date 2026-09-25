import { getUserFirstName } from "@/lib/auth/display-name";
import {
  isConfiguredOrganizationDisplayName,
  resolveOrganizationDisplayName,
} from "@/lib/company/display-name";
import type { User } from "@supabase/supabase-js";

type ResolveDashboardHeaderLabelInput = {
  companyName?: string | null;
  organizationName?: string | null;
  user?: User | null;
};

export function resolveDashboardHeaderLabel({
  companyName,
  organizationName,
  user,
}: ResolveDashboardHeaderLabelInput) {
  const displayName = resolveOrganizationDisplayName(
    companyName ?? "",
    organizationName ?? ""
  );

  if (isConfiguredOrganizationDisplayName(displayName)) {
    return displayName;
  }

  const firstName = getUserFirstName(user);
  if (firstName) {
    return `Welcome back, ${firstName}`;
  }

  return "Welcome to VoltPilot";
}
