import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getProjectInsights } from "@/lib/ai/project-insights";
import { getTeamContext } from "@/lib/auth/get-team-context";
import { buildProfileInsights } from "@/lib/projects/insights";
import {
  getAssignableTeamMembers,
  getProjectAssignments,
} from "@/lib/projects/assignments";
import {
  canViewProjectAssignmentsSection,
  getProjectAccessContext,
} from "@/lib/projects/project-access";
import { getProjectById } from "@/lib/projects/queries";
import { getProjectProfile } from "@/lib/projects/profile";
import {
  PROJECT_DETAIL_TABS,
  parseEntityTab,
  type ProjectDetailTabId,
} from "@/lib/ui/entity-tab-ids";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getTeamContext();

  const [project, profile] = await Promise.all([
    getProjectById(id),
    getProjectProfile(id),
  ]);

  if (!project || !profile) {
    notFound();
  }

  let showProjectAssignments = false;
  let projectAssignments: Awaited<ReturnType<typeof getProjectAssignments>> = [];
  let assignableTeamMembers: Awaited<ReturnType<typeof getAssignableTeamMembers>> =
    [];
  let canManageProjectAssignments = false;

  if (context?.organizationId) {
    const access = await getProjectAccessContext(
      context.organizationId,
      context.role
    );

    canManageProjectAssignments = access.canManageAssignments;
    showProjectAssignments =
      access.enforceAssignments &&
      canViewProjectAssignmentsSection(context.role);

    if (showProjectAssignments) {
      [projectAssignments, assignableTeamMembers] = await Promise.all([
        getProjectAssignments(id),
        canManageProjectAssignments
          ? getAssignableTeamMembers(context.organizationId, id)
          : Promise.resolve([]),
      ]);
    }
  }

  const defaultTab: ProjectDetailTabId =
    project.status === "Awarded" ? "job-costing" : "overview";
  const initialTab = parseEntityTab<ProjectDetailTabId>(
    query.tab,
    PROJECT_DETAIL_TABS,
    defaultTab
  );

  let aiInsights = null;
  if (context?.organizationId) {
    try {
      aiInsights = await getProjectInsights(id, context.organizationId);
    } catch {
      aiInsights = null;
    }
  }

  const profileInsights = buildProfileInsights({
    project,
    kpis: profile.kpis,
    budget: profile.budget,
    field: profile.field,
    estimateCount: profile.estimates.length,
    proposalCount: profile.proposals.length,
  });

  const mergedInsights = [...profileInsights];
  const seen = new Set(profileInsights.map((item) => item.title.toLowerCase()));

  if (aiInsights) {
    for (const insight of aiInsights.insights) {
      if (!seen.has(insight.title.toLowerCase())) {
        mergedInsights.push(insight);
        seen.add(insight.title.toLowerCase());
      }
    }
  }

  return (
    <>
      <DashboardTopNav title={project.project_name} />
      <PageMain>
        <ProjectDetail
          project={project}
          profile={profile}
          insights={mergedInsights.slice(0, 8)}
          complexityLabel={aiInsights?.complexityLabel ?? "Moderate"}
          complexityScore={aiInsights?.complexityScore ?? 5}
          insightsSummary={
            aiInsights?.summary ??
            `${project.project_name} has ${profile.estimates.length} estimate(s) and ${profile.proposals.length} proposal(s).`
          }
          initialTab={initialTab}
          showProjectAssignments={showProjectAssignments}
          projectAssignments={projectAssignments}
          assignableTeamMembers={assignableTeamMembers}
          canManageProjectAssignments={canManageProjectAssignments}
        />
      </PageMain>
    </>
  );
}
