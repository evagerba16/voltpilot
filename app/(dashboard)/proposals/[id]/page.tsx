import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { ProposalEditor } from "@/components/proposals/proposal-editor";
import { getProposalMedia } from "@/lib/proposals/proposal-media-queries";
import { getProposalById } from "@/lib/proposals/queries";

type ProposalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params;
  const proposal = await getProposalById(id);

  if (!proposal) {
    notFound();
  }

  const media = await getProposalMedia(id);

  return (
    <>
      <DashboardTopNav title={proposal.title} />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <ProposalEditor proposal={proposal} media={media} />
        </div>
      </main>
    </>
  );
}
