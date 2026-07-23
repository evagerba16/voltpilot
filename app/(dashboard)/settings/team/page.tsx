import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { SettingsNav } from "@/components/settings/settings-nav";
import { TeamManagement } from "@/components/settings/team-management";
import { getTeamPageData } from "@/app/(dashboard)/settings/team/actions";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { hasPermission } from "@/lib/teams/permissions";

export default async function TeamSettingsPage() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/settings/team");
  }

  if (!hasPermission(context.permissions, "settings.team.view")) {
    redirect("/settings");
  }

  const result = await getTeamPageData();

  if ("error" in result && result.error) {
    return (
      <>
        <DashboardTopNav title="Settings" />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <SettingsNav
              showTeam={hasPermission(context.permissions, "settings.team.view")}
              showBilling={hasPermission(context.permissions, "settings.billing.view")}
            />
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-5 text-sm text-destructive">
              {result.error}
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardTopNav title="Settings" />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Invite teammates, assign roles, and manage access to VoltPilot.
            </p>
          </div>
          <SettingsNav
            showTeam={hasPermission(context.permissions, "settings.team.view")}
            showBilling={hasPermission(context.permissions, "settings.billing.view")}
          />
          <TeamManagement
            overview={result.overview!}
            canManage={result.canManage!}
            currentRole={result.context!.role}
          />
        </div>
      </main>
    </>
  );
}
