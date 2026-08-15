import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { ProposalEditor } from "@/components/proposals/proposal-editor";
import { getProposalProfile } from "@/lib/proposals/profile";
import { buildProposalInsights } from "@/lib/proposals/insights";
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

  const [media, profile] = await Promise.all([
    getProposalMedia(id),
    getProposalProfile(proposal),
  ]);

  const insights = buildProposalInsights({
    proposal,
    analytics: profile.analytics,
  });

  return (
    <>
      <DashboardTopNav title={proposal.title} />
      <PageMain className="[&>div]:space-y-10">
        <ProposalEditor
          proposal={proposal}
          media={media}
          profile={profile}
          insights={insights}
        />
      </PageMain>
    </>
  );
}
