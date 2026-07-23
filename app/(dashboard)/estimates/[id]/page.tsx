import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { EstimateBuilder } from "@/components/estimates/estimate-builder";
import {
  getEstimateById,
  getEstimateVersions,
  mapEstimateToBuilderState,
} from "@/lib/estimates/queries";

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

  const [initialState, versions] = await Promise.all([
    Promise.resolve(
      mapEstimateToBuilderState(result.estimate, result.lineItems)
    ),
    getEstimateVersions(id),
  ]);

  return (
    <>
      <DashboardTopNav title={result.estimate.title} />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <EstimateBuilder
            estimateId={result.estimate.id}
            initialState={initialState}
            initialStatus={result.estimate.status}
            initialVersions={versions}
            project={result.estimate.project}
          />
        </div>
      </main>
    </>
  );
}
