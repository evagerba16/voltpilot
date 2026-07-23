import { redirect } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { BillingPanel } from "@/components/settings/billing-panel";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getOrganizationSubscription } from "@/lib/billing/queries";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getStripePlanConfig } from "@/lib/stripe/env";
import { hasPermission } from "@/lib/teams/permissions";

export default async function BillingSettingsPage() {
  const context = await getTeamContext();

  if (!context) {
    redirect("/login?next=/settings/billing");
  }

  if (!hasPermission(context.permissions, "settings.billing.view")) {
    redirect("/settings");
  }

  const [subscription, plan] = await Promise.all([
    getOrganizationSubscription(context.organizationId),
    Promise.resolve(getStripePlanConfig()),
  ]);

  const canManage = hasPermission(context.permissions, "settings.billing.manage");

  return (
    <>
      <DashboardTopNav title="Billing" />
      <PageMain width="narrow">
        <PageIntro description="Manage your VoltPilot subscription, payment method, and billing history." />
        <SettingsNav
          showTeam={hasPermission(context.permissions, "settings.team.view")}
          showBilling
        />
        <BillingPanel
          subscription={subscription}
          planName={plan.planName}
          priceMonthly={plan.priceMonthly}
          canManage={canManage}
        />
      </PageMain>
    </>
  );
}
