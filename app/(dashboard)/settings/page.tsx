import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getTeamContext } from "@/lib/auth/get-team-context";
import {
  getOrganizationEntitlements,
  isB2BOrganizationPlan,
  shouldShowBillingInSettings,
} from "@/lib/billing/entitlements";
import { shouldShowAuditLogInSettings } from "@/lib/audit/queries";
import { getCompanySettings } from "@/lib/company/queries";
import { hasPermission } from "@/lib/teams/permissions";

export default async function SettingsPage() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/settings");
  }

  if (!hasPermission(context.permissions, "settings.company.view")) {
    redirect("/dashboard");
  }

  const [settings, showBilling, showAuditLog, entitlements] = await Promise.all([
    getCompanySettings(context.organizationId),
    shouldShowBillingInSettings(context.organizationId, context.permissions),
    shouldShowAuditLogInSettings(context.organizationId, context.permissions),
    getOrganizationEntitlements(context.organizationId),
  ]);
  const isB2B = isB2BOrganizationPlan(entitlements.planType);
  const canEdit = hasPermission(context.permissions, "settings.company.edit");
  const readOnlyMessage = canEdit
    ? undefined
    : "You have view-only access to company settings.";

  return (
    <>
      <DashboardTopNav title="Settings" />
      <PageMain width="narrow">
        <PageIntro description="Configure your company profile and default proposal content." />
        <SettingsNav
          showTeam={hasPermission(context.permissions, "settings.team.view")}
          showAuditLog={showAuditLog}
          showBilling={showBilling}
        />
        <CompanySettingsForm
          settings={settings}
          canEdit={canEdit}
          readOnlyMessage={readOnlyMessage}
          isB2B={isB2B}
          organizationName={context.organizationName}
        />
      </PageMain>
    </>
  );
}
