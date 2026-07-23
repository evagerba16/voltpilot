import { AiAssistantHub } from "@/components/ai/ai-assistant-hub";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { AlertBanner } from "@/components/ui/alert-banner";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";

export default async function AiPage() {
  const context = await getTeamContext();
  let insights = null;
  let loadError: string | null = null;

  if (context) {
    try {
      insights = await getDashboardInsights(context.organizationId);
    } catch {
      loadError =
        "We couldn't load AI insights. Refresh the page or try again in a moment.";
    }
  }

  return (
    <>
      <DashboardTopNav title="AI Assistant" />
      <PageMain>
        <AiAssistantHub />

        {loadError ? (
          <AlertBanner variant="error" title="Unable to load AI insights">
            {loadError}
          </AlertBanner>
        ) : insights ? (
          <AiInsightsPanel data={insights} />
        ) : null}
      </PageMain>
    </>
  );
}
