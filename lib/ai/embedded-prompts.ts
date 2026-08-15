import type { VoltAiContextParams } from "@/lib/ai/context";

export function embeddedPromptsForContext(params: VoltAiContextParams): string[] {
  if (params.estimateId) {
    return [
      "What should I fix before sending this estimate?",
      "Is my margin healthy on this job?",
      "What line items might I be missing?",
    ];
  }

  if (params.focus === "proposal") {
    return [
      "Draft a follow-up email for this proposal",
      "What would improve acceptance odds?",
      "Summarize scope for the customer",
    ];
  }

  if (params.focus === "job-costing") {
    return [
      "Is this job on budget?",
      "Where are we over on costs?",
      "What should I watch on this job?",
    ];
  }

  if (params.projectId) {
    return [
      "What's the next step on this project?",
      "Are there margin risks on this job?",
      "Draft a customer update for this project",
    ];
  }

  if (params.customerId) {
    return [
      "Draft a follow-up message for this customer",
      "What proposals need attention?",
      "Summarize this customer's pipeline",
    ];
  }

  return [
    "What should I follow up on today?",
    "Why are my margins low?",
    "Review my pipeline",
  ];
}
