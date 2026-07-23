import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getProjectById, getProjectEstimates } from "@/lib/projects/queries";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const [project, estimates] = await Promise.all([
    getProjectById(id),
    getProjectEstimates(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <>
      <DashboardTopNav title="Project Details" />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <ProjectDetail project={project} estimates={estimates} />
        </div>
      </main>
    </>
  );
}
