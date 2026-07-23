import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { ProjectForm } from "@/components/projects/project-form";
import { getCustomerOptions, getProjectById } from "@/lib/projects/queries";

type EditProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const [project, customers] = await Promise.all([
    getProjectById(id),
    getCustomerOptions(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <>
      <DashboardTopNav title="Edit Project" />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <ProjectForm
            project={project}
            customers={customers}
            cancelHref={`/projects/${project.id}`}
          />
        </div>
      </main>
    </>
  );
}
