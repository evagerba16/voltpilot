import { redirect } from "next/navigation";

import { AiAssistantHub } from "@/components/ai/ai-assistant-hub";
import { VoltAiAdvisorDashboard } from "@/components/ai/volt-ai-advisor-dashboard";
import { DailyAiBriefing } from "@/components/dashboard/daily-ai-briefing";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { AlertBanner } from "@/components/ui/alert-banner";
import { buildVoltAiAdvisorViewModel } from "@/lib/ai/business-advisor";
import { parseVoltAiContextParams } from "@/lib/ai/context";
import { getDailyBriefing } from "@/lib/ai/daily-briefing";
import { getDashboardInsights } from "@/lib/ai/dashboard-insights";
import { getProactiveCopilotSuggestions } from "@/lib/ai/proactive-copilot";
import { assertPermission } from "@/lib/auth/get-team-context";
import { isPermissionDenied } from "@/lib/auth/permission-errors";
import { getAnalyticsData } from "@/lib/analytics/queries";
import type { AnalyticsFilters } from "@/lib/analytics/types";

const COMMAND_CENTER_FILTERS: AnalyticsFilters = {
  dateRange: "90d",
  customerId: "",
  projectId: "",
  projectStatus: "",
};

function redirectContextualParamsToWorkflow(
  params: ReturnType<typeof parseVoltAiContextParams>
) {
  if (params.estimateId) {
    redirect(`/estimates/${params.estimateId}`);
  }

  if (params.projectId && params.focus === "job-costing") {
    redirect(`/projects/${params.projectId}?tab=job-costing`);
  }

  if (params.projectId) {
    redirect(`/projects/${params.projectId}`);
  }

  if (params.customerId) {
    redirect(`/customers/${params.customerId}`);
  }
}

type AiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AiPage({ searchParams }: AiPageProps) {
  try {
    await assertPermission("ai.view");
  } catch (error) {
    if (isPermissionDenied(error)) {
      return (
        <>
          <DashboardTopNav title="Command Center" />
          <PageMain>
            <AlertBanner variant="error" title="Access denied">
              You do not have permission to use Volt AI.
            </AlertBanner>
          </PageMain>
        </>
      );
    }

    throw error;
  }

  const query = await searchParams;
  const contextParams = parseVoltAiContextParams(query);
  redirectContextualParamsToWorkflow(contextParams);

  const context = await assertPermission("ai.view");
  let advisor = null;
  let dailyBriefing: Awaited<ReturnType<typeof getDailyBriefing>> | null = null;
  let copilotSuggestions: Awaited<
    ReturnType<typeof getProactiveCopilotSuggestions>
  >["suggestions"] = [];
  let loadError: string | null = null;

  try {
    const [analyticsData, dashboardInsights, copilot, briefing] = await Promise.all([
      getAnalyticsData(COMMAND_CENTER_FILTERS),
      getDashboardInsights(context.organizationId),
      getProactiveCopilotSuggestions(context.organizationId),
      getDailyBriefing(context.organizationId),
    ]);

    advisor = buildVoltAiAdvisorViewModel(analyticsData, dashboardInsights);
    copilotSuggestions = copilot.suggestions;
    dailyBriefing = briefing;
  } catch {
    loadError =
      "We couldn't load the command center. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Command Center" />
      <PageMain>
        {loadError ? (
          <>
            <AlertBanner variant="error" title="Unable to load Command Center">
              {loadError}
            </AlertBanner>
            <div className="mt-6">
              <AiAssistantHub />
            </div>
          </>
        ) : advisor ? (
          <div className="space-y-8">
            {dailyBriefing ? (
              <DailyAiBriefing briefing={dailyBriefing} displayName={context.displayName} />
            ) : null}
            <VoltAiAdvisorDashboard
              data={advisor}
              copilotSuggestions={copilotSuggestions}
            />
          </div>
        ) : null}
      </PageMain>
    </>
  );
}
