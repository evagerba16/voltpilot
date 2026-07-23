import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { EstimatesView } from "@/components/estimates/estimates-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  getActiveProjectOptions,
  getEstimates,
  type ProjectOption,
} from "@/lib/estimates/queries";

type EstimatesPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    project?: string;
  }>;
};

export default async function EstimatesPage({
  searchParams,
}: EstimatesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const projectFilter = params.project?.trim() ?? "";

  let data;
  let projects: ProjectOption[] = [];
  let loadError: string | null = null;

  try {
    [data, projects] = await Promise.all([
      getEstimates({ page, search, project: projectFilter }),
      getActiveProjectOptions(),
    ]);
  } catch {
    loadError =
      "We couldn't load your estimates. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Estimates" />
      <PageMain>
        <PageIntro description="Price jobs with line-item detail—tie estimates to projects and turn them into proposals when you're ready to bid." />

        {loadError ? (
          <AlertBanner variant="error" title="Unable to load estimates">
            {loadError}
          </AlertBanner>
        ) : (
          <EstimatesView
            estimates={data!.estimates}
            projects={projects}
            total={data!.total}
            page={data!.page}
            totalPages={data!.totalPages}
            search={search}
            projectFilter={projectFilter}
          />
        )}
      </PageMain>
    </>
  );
}
