import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { ProjectForm } from "@/components/projects/project-form";
import { getCustomerOptions } from "@/lib/projects/queries";

type NewProjectPageProps = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const params = await searchParams;
  const customers = await getCustomerOptions();
  const defaultCustomerId = params.customer?.trim() ?? "";

  return (
    <>
      <DashboardTopNav title="New Project" />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <ProjectForm
            customers={customers}
            cancelHref="/projects"
            defaultCustomerId={defaultCustomerId}
          />
        </div>
      </main>
    </>
  );
}
