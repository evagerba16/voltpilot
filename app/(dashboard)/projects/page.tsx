import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { ProjectsStats } from "@/components/projects/projects-stats";
import { ProjectsView } from "@/components/projects/projects-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  getCustomerOptions,
  getProjectStats,
  getProjects,
} from "@/lib/projects/queries";
import { getProjectsListMetrics } from "@/lib/projects/profile";
import {
  PROJECT_SORT_FIELDS,
  type ProjectArchiveFilter,
  type ProjectSortField,
} from "@/lib/projects/types";

type ProjectsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    order?: string;
    view?: string;
    status?: string;
    type?: string;
    customer?: string;
  }>;
};

function parseSortField(value: string | undefined): ProjectSortField {
  if (value && PROJECT_SORT_FIELDS.includes(value as ProjectSortField)) {
    return value as ProjectSortField;
  }

  return "created_at";
}

function parseSortOrder(value: string | undefined): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function parseArchiveFilter(value: string | undefined): ProjectArchiveFilter {
  if (value === "archived" || value === "all") {
    return value;
  }

  return "active";
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const sort = parseSortField(params.sort);
  const order = parseSortOrder(params.order);
  const view = parseArchiveFilter(params.view);
  const statusFilter = params.status?.trim() ?? "";
  const typeFilter = params.type?.trim() ?? "";
  const customerFilter = params.customer?.trim() ?? "";

  let data;
  let customers: Awaited<ReturnType<typeof getCustomerOptions>> = [];
  let stats: Awaited<ReturnType<typeof getProjectStats>> | null = null;
  let listMetrics: Awaited<ReturnType<typeof getProjectsListMetrics>> = {};
  let loadError: string | null = null;

  try {
    data = await getProjects({
      page,
      search,
      sort,
      order,
      view,
      status: statusFilter,
      type: typeFilter,
      customer: customerFilter,
    });

    [customers, stats, listMetrics] = await Promise.all([
      getCustomerOptions(),
      getProjectStats(),
      getProjectsListMetrics(data.projects),
    ]);
  } catch {
    loadError = "We couldn't load your projects. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Projects" />
      <PageMain>
        {loadError ? (
          <AlertBanner variant="error" title="Unable to load projects">
            {loadError}
          </AlertBanner>
        ) : (
          <>
            {stats ? (
              <ProjectsStats
                activeProjects={stats.activeProjects}
                estimatingProjects={stats.estimatingProjects}
                proposalsSent={stats.proposalsSent}
                awardedProjects={stats.awardedProjects}
                estimatedRevenue={stats.estimatedRevenue}
                averageMargin={stats.averageMargin}
                compact
              />
            ) : null}

            <ProjectsView
              projects={data!.projects}
              customers={customers}
              listMetrics={listMetrics}
              total={data!.total}
              page={data!.page}
              totalPages={data!.totalPages}
              search={search}
              sort={sort}
              order={order}
              view={view}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              customerFilter={customerFilter}
            />
          </>
        )}
      </PageMain>
    </>
  );
}
