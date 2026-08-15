import type { ProposalEditorState } from "@/lib/proposals/types";

export type ProposalReviewSuggestionKind = "warning" | "info" | "success";

export type ProposalReviewSuggestion = {
  id: string;
  kind: ProposalReviewSuggestionKind;
  message: string;
  field?: keyof ProposalEditorState;
  pointsDeducted: number;
};

export type ProposalReviewResult = {
  score: number;
  starRating: number;
  suggestions: ProposalReviewSuggestion[];
  summary: string;
  readyToSend: boolean;
  reviewedAt: string;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function scoreToStars(score: number) {
  if (score >= 95) return 5;
  if (score >= 85) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  return 1;
}

function checkWarranty(state: ProposalEditorState): ProposalReviewSuggestion | null {
  if (hasText(state.warranty_information)) {
    return null;
  }

  return {
    id: "warranty",
    kind: "warning",
    message: "Add warranty section.",
    field: "warranty_information",
    pointsDeducted: 8,
  };
}

function checkPaymentSchedule(state: ProposalEditorState): ProposalReviewSuggestion | null {
  const haystack = [
    state.terms_and_conditions,
    state.notes,
    state.assumptions,
  ].join(" ");

  const hasPaymentLanguage = includesAny(haystack, [
    "payment",
    "deposit",
    "progress billing",
    "net 30",
    "net 15",
    "due upon",
    "invoice",
    "retainage",
    "milestone",
  ]);

  if (hasPaymentLanguage) {
    return null;
  }

  return {
    id: "payment-schedule",
    kind: "warning",
    message: "Clarify payment schedule.",
    field: "terms_and_conditions",
    pointsDeducted: 10,
  };
}

function checkProjectTimeline(state: ProposalEditorState): ProposalReviewSuggestion | null {
  const haystack = [
    state.scope_of_work,
    state.assumptions,
    state.notes,
  ].join(" ");

  const hasTimelineLanguage = includesAny(haystack, [
    "timeline",
    "schedule",
    "duration",
    "business day",
    "week",
    "completion date",
    "start date",
    "mobilize",
    "phasing",
  ]);

  if (hasTimelineLanguage) {
    return null;
  }

  return {
    id: "project-timeline",
    kind: "warning",
    message: "Add project timeline.",
    field: "scope_of_work",
    pointsDeducted: 9,
  };
}

function checkPermitInformation(state: ProposalEditorState): ProposalReviewSuggestion | null {
  const haystack = [
    state.scope_of_work,
    state.assumptions,
    state.exclusions,
    state.notes,
  ].join(" ");

  const hasPermitLanguage = includesAny(haystack, [
    "permit",
    "inspection",
    "ahj",
    "authority having jurisdiction",
    "code compliance",
    "pull permit",
  ]);

  if (hasPermitLanguage) {
    return null;
  }

  return {
    id: "permit-info",
    kind: "warning",
    message: "Include permit information.",
    field: "assumptions",
    pointsDeducted: 8,
  };
}

function checkScopeOfWork(state: ProposalEditorState): ProposalReviewSuggestion | null {
  if (hasText(state.scope_of_work) && state.scope_of_work.trim().length >= 40) {
    return null;
  }

  return {
    id: "scope-of-work",
    kind: "warning",
    message: "Expand scope of work so the customer understands what's included.",
    field: "scope_of_work",
    pointsDeducted: hasText(state.scope_of_work) ? 6 : 15,
  };
}

function checkExclusions(state: ProposalEditorState): ProposalReviewSuggestion | null {
  if (hasText(state.exclusions)) {
    return null;
  }

  return {
    id: "exclusions",
    kind: "info",
    message: "Add exclusions to reduce scope disputes after award.",
    field: "exclusions",
    pointsDeducted: 5,
  };
}

function checkTerms(state: ProposalEditorState): ProposalReviewSuggestion | null {
  if (hasText(state.terms_and_conditions)) {
    return null;
  }

  return {
    id: "terms",
    kind: "warning",
    message: "Add terms and conditions before sending.",
    field: "terms_and_conditions",
    pointsDeducted: 12,
  };
}

function checkExpirationDate(state: ProposalEditorState): ProposalReviewSuggestion | null {
  if (hasText(state.expiration_date)) {
    return null;
  }

  return {
    id: "expiration-date",
    kind: "info",
    message: "Set an expiration date so pricing stays defensible.",
    field: "expiration_date",
    pointsDeducted: 4,
  };
}

function buildSummary(score: number, suggestionCount: number) {
  if (score >= 90 && suggestionCount === 0) {
    return "Proposal is polished and ready to send.";
  }

  if (score >= 85) {
    return "Strong proposal — address the suggestions below before sending.";
  }

  if (score >= 70) {
    return "Good foundation — a few sections need attention before this goes out.";
  }

  return "Important proposal sections are missing. Review suggestions before sending.";
}

export function reviewProposal(state: ProposalEditorState): ProposalReviewResult {
  const checks = [
    checkScopeOfWork(state),
    checkTerms(state),
    checkPaymentSchedule(state),
    checkProjectTimeline(state),
    checkPermitInformation(state),
    checkWarranty(state),
    checkExclusions(state),
    checkExpirationDate(state),
  ].filter((item): item is ProposalReviewSuggestion => item !== null);

  const pointsDeducted = checks.reduce((sum, item) => sum + item.pointsDeducted, 0);
  const score = Math.max(0, Math.min(100, 100 - pointsDeducted));
  const starRating = scoreToStars(score);

  const suggestions = checks.sort((a, b) => b.pointsDeducted - a.pointsDeducted);

  return {
    score,
    starRating,
    suggestions,
    summary: buildSummary(score, suggestions.length),
    readyToSend: score >= 85 && !suggestions.some((item) => item.pointsDeducted >= 12),
    reviewedAt: new Date().toISOString(),
  };
}

export function formatProposalStarRating(stars: number) {
  return "⭐".repeat(stars);
}
