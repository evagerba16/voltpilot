import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { ProjectForm } from "@/components/projects/project-form";
import { getCustomerOptions } from "@/lib/projects/queries";

export default async function NewProjectPage() {
  const customers = await getCustomerOptions();

  return (
    <>
      <DashboardTopNav title="New Project" />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <ProjectForm customers={customers} cancelHref="/projects" />
        </div>
      </main>
    </>
  );
}
