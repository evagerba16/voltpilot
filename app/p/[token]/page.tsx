import { notFound } from "next/navigation";

import { loadCustomerProposal } from "@/app/p/[token]/actions";
import { CustomerProposalView } from "@/components/proposals/customer-proposal-view";
import { ProposalExpiredView } from "@/components/proposals/proposal-expired-view";

type CustomerProposalPageProps = {
  params: Promise<{ token: string }>;
};

export default async function CustomerProposalPage({
  params,
}: CustomerProposalPageProps) {
  const { token } = await params;
  const result = await loadCustomerProposal(token);

  if (result.error === "invalid" || !result.proposal) {
    notFound();
  }

  if (result.error === "expired") {
    return <ProposalExpiredView proposal={result.proposal} token={token} />;
  }

  return <CustomerProposalView token={token} initialProposal={result.proposal} />;
}
