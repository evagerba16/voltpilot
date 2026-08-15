import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { EstimateBuilder } from "@/components/estimates/estimate-builder";
import {
  getEstimateById,
  getEstimateVersions,
  mapEstimateToBuilderState,
} from "@/lib/estimates/queries";
import { getEstimateGuidance } from "@/lib/lessons/queries";

type EstimateBuilderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EstimateBuilderPage({
  params,
}: EstimateBuilderPageProps) {
  const { id } = await params;
  const result = await getEstimateById(id);

  if (!result) {
    notFound();
  }

  const [initialState, versions, guidance] = await Promise.all([
    Promise.resolve(
      mapEstimateToBuilderState(result.estimate, result.lineItems)
    ),
    getEstimateVersions(id),
    getEstimateGuidance({
      projectId: result.estimate.project.id,
      projectName: result.estimate.project.project_name,
      projectType: result.estimate.project.project_type ?? "Other",
      customerId: result.estimate.project.customer.id,
      customerName: result.estimate.project.customer.company_name,
    }),
  ]);

  return (
    <>
      <DashboardTopNav title={result.estimate.title} />
      <PageMain className="[&>div]:space-y-10">
        <EstimateBuilder
          estimateId={result.estimate.id}
          initialState={initialState}
          initialStatus={result.estimate.status}
          initialVersions={versions}
          project={result.estimate.project}
          guidance={guidance}
        />
      </PageMain>
    </>
  );
}
