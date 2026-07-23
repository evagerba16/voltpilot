const LOCKED_PROPOSAL_STATUSES = new Set([
  "Sent",
  "Viewed",
  "Accepted",
  "Declined",
  "Expired",
]);

export function isProposalLocked(status: string) {
  return LOCKED_PROPOSAL_STATUSES.has(status);
}

export const PROPOSAL_LOCKED_MESSAGE =
  "This proposal has been sent to the customer and can no longer be edited.";
