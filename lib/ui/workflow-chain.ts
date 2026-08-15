/**
 * Contractor workflow chain and primary CTA expectations.
 * Workflow Momentum Rule: advance forward or explain why not.
 * @see docs/PRODUCT_STANDARD_V1.md
 */
export const CONTRACTOR_WORKFLOW_CHAIN = [
  "dashboard",
  "customer",
  "project",
  "estimate",
  "proposal",
  "awarded",
  "job-costing",
  "analytics",
] as const;

export type ContractorWorkflowStep = (typeof CONTRACTOR_WORKFLOW_CHAIN)[number];

/** Primary CTA should advance forward or explain blockage — never leave user wondering. */
export const WORKFLOW_PRIMARY_CTA_EXAMPLES = [
  { state: "Estimate complete", action: "Create proposal" },
  { state: "Proposal sent", action: "Waiting for customer response" },
  { state: "Proposal accepted", action: "Convert to active project" },
  { state: "Project complete", action: "Review job performance" },
  { state: "Missing required information", action: "Complete required fields" },
] as const;

/** The Golden Question — every new feature must answer this. */
export const GOLDEN_QUESTION =
  "How does this help the contractor finish today's work?";
