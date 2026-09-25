import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { AuditLogList } from "@/components/settings/audit-log-list";
import { SettingsNav } from "@/components/settings/settings-nav";
import {
  listOrganizationAuditEvents,
  shouldShowAuditLogInSettings,
} from "@/lib/audit/queries";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { shouldShowBillingInSettings } from "@/lib/billing/entitlements";
import { hasPermission } from "@/lib/teams/permissions";

export default async function AuditLogSettingsPage() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/settings/audit-log");
  }

  const [showAuditLog, showBilling, events] = await Promise.all([
    shouldShowAuditLogInSettings(context.organizationId, context.permissions),
    shouldShowBillingInSettings(context.organizationId, context.permissions),
    hasPermission(context.permissions, "settings.audit.view")
      ? listOrganizationAuditEvents(context.organizationId)
      : Promise.resolve([]),
  ]);

  if (!showAuditLog) {
    redirect("/settings");
  }

  return (
    <>
      <DashboardTopNav title="Settings" />
      <PageMain width="narrow">
        <PageIntro description="A record of team, project, and company changes for your organization." />
        <SettingsNav
          showTeam={hasPermission(context.permissions, "settings.team.view")}
          showAuditLog={showAuditLog}
          showBilling={showBilling}
        />
        <AuditLogList events={events} />
      </PageMain>
    </>
  );
}
