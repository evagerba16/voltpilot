import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrganizationPreferenceSync } from "@/components/dashboard/organization-preference-sync";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getUser } from "@/lib/auth/get-user";
import {
  getOrganizationSubscription,
  isSubscriptionActive,
} from "@/lib/billing/queries";
import { getCompanySettings } from "@/lib/company/queries";
import { resolveDashboardHeaderLabel } from "@/lib/dashboard/header-label";
import { hasPermission } from "@/lib/teams/permissions";
import { getTeamAccessDenial } from "@/lib/teams/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const context = await getTeamContext();
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (!context) {
    if (user?.id) {
      const denial = await getTeamAccessDenial(user.id);

      if (denial === "deactivated") {
        redirect(
          `/auth/terminal?error=${encodeURIComponent("Your account has been deactivated. Contact your organization admin.")}`
        );
      }

      redirect("/subscribe");
    }

    redirect("/login?next=/dashboard");
  }

  const billingExempt = pathname.startsWith("/settings/billing");
  const subscription = await getOrganizationSubscription(context.organizationId);

  if (!isSubscriptionActive(subscription?.status ?? "inactive") && !billingExempt) {
    if (hasPermission(context.permissions, "settings.billing.manage")) {
      redirect("/settings/billing");
    }

    redirect(
      `/auth/terminal?error=${encodeURIComponent("Your organization subscription is inactive. Contact your account owner.")}`
    );
  }

  const companySettings = await getCompanySettings(
    context.organizationId,
    context.userId
  );

  const headerLabel = resolveDashboardHeaderLabel({
    companyName: companySettings.company_name,
    organizationName: context.organizationName,
    user,
  });

  return (
    <DashboardShell
      companyName={headerLabel}
      userEmail={context.userEmail}
      roleLabel={context.role}
      permissions={context.permissions}
    >
      <OrganizationPreferenceSync organizationId={context.organizationId} />
      {children}
    </DashboardShell>
  );
}
