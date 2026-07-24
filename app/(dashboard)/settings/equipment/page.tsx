import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { EquipmentManagementPanel } from "@/components/settings/equipment-management-panel";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { buildEquipmentCatalogRows } from "@/lib/estimates/org-catalog/merge-equipment";
import { getOrganizationCatalogItems } from "@/lib/estimates/org-catalog/queries";
import { hasPermission } from "@/lib/teams/permissions";

export default async function EquipmentSettingsPage() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/settings/equipment");
  }

  if (!hasPermission(context.permissions, "settings.company.view")) {
    redirect("/dashboard");
  }

  const overrides = await getOrganizationCatalogItems(context.organizationId, "equipment");
  const rows = buildEquipmentCatalogRows(overrides);
  const canEdit = hasPermission(context.permissions, "settings.company.edit");
  const readOnlyMessage = canEdit
    ? undefined
    : "You have view-only access to equipment settings.";

  return (
    <>
      <DashboardTopNav title="Settings" />
      <PageMain width="full">
        <PageIntro description="Manage your company equipment catalog used in estimates." />
        <SettingsNav
          showTeam={hasPermission(context.permissions, "settings.team.view")}
          showBilling={hasPermission(context.permissions, "settings.billing.view")}
        />
        <EquipmentManagementPanel
          rows={rows}
          canEdit={canEdit}
          readOnlyMessage={readOnlyMessage}
        />
      </PageMain>
    </>
  );
}
