import assert from "node:assert/strict";

import {
  formatProposalSendBlockerContext,
  getProposalSendBlockers,
  reviewProposal,
} from "../lib/ai/proposal-review";
import { buildDefaultProposalContent } from "../lib/proposals/build-from-estimate";
import { resolveProposalPrimaryAction } from "../lib/proposals/primary-action";
import type { ProposalEditorState } from "../lib/proposals/types";

function emptyCompany() {
  return {
    company_name: "Test Electric",
    default_terms: "",
    default_warranty: "",
    default_exclusions: "",
    contractor_signature_name: "Alex",
    contractor_signature_title: "PM",
  } as Parameters<typeof buildDefaultProposalContent>[1];
}

function readyState(): ProposalEditorState {
  return {
    title: "Panel Upgrade Proposal",
    proposal_date: "2026-08-31",
    expiration_date: "2026-09-30",
    scope_of_work:
      "Electrical scope of work for Summit Health:\n\n• Replace main panel\n• Install new breakers\n• Coordinate inspection",
    materials_summary: "Panel and breakers per estimate.",
    labor_summary: "Licensed electricians per estimate.",
    equipment_summary: "",
    show_line_item_breakdown: true,
    assumptions:
      "Normal working hours. Permits pulled by contractor. Completion within 2 weeks of award.",
    exclusions: "Structural repairs and utility service upgrades are excluded.",
    terms_and_conditions:
      "Payment: 50% deposit due upon acceptance. Balance net 15 upon substantial completion.",
    warranty_information: "One-year workmanship warranty on all installed work.",
    customer_signature_name: "Jordan Lee",
    customer_signature_title: "Facilities Manager",
    contractor_signature_name: "Alex Morgan",
    contractor_signature_title: "Project Manager",
    notes: "",
    internal_notes: "",
  };
}

function testSeededProposalIsNotReadyToSend() {
  const seeded = buildDefaultProposalContent(
    [
      {
        category: "miscellaneous",
        description: "Journeyman electrician labor",
        quantity: 8,
        unit: "hr",
        unit_cost: 95,
        sort_order: 0,
      },
    ],
    emptyCompany(),
    "Medical Office Panel Upgrade",
    "Jordan Lee"
  );

  const review = reviewProposal(seeded);
  assert.equal(review.readyToSend, false, "seeded proposal should not be ready to send");
  assert.ok(review.suggestions.some((item) => item.id === "terms"));
  assert.ok(review.suggestions.some((item) => item.id === "payment-schedule"));
}

function testReadyProposalShowsSendPrimaryAction() {
  const review = reviewProposal(readyState());
  assert.equal(review.readyToSend, true);

  const action = resolveProposalPrimaryAction({
    status: "Draft",
    canEdit: true,
    readyToSend: review.readyToSend,
    sendBlockers: getProposalSendBlockers(review),
  });

  assert.equal(action.kind, "send");
  assert.equal(action.label, "Send to customer");
}

function testIncompleteProposalShowsCompletePrimaryAction() {
  const review = reviewProposal(readyState());
  const incomplete = { ...readyState(), terms_and_conditions: "" };
  const incompleteReview = reviewProposal(incomplete);
  const blockers = getProposalSendBlockers(incompleteReview);

  assert.equal(incompleteReview.readyToSend, false);
  assert.ok(blockers.some((item) => item.id === "terms"));

  const action = resolveProposalPrimaryAction({
    status: "Draft",
    canEdit: true,
    readyToSend: incompleteReview.readyToSend,
    sendBlockers: blockers,
  });

  assert.equal(action.kind, "complete_to_send");
  assert.equal(action.label, "Complete to send");
  assert.match(action.context, /terms and conditions/i);
  assert.match(action.context, /send is unavailable/i);
}

function testBlockerContextSummarizesMultipleItems() {
  const incomplete = {
    ...readyState(),
    terms_and_conditions: "",
    warranty_information: "",
    exclusions: "",
  };
  const blockers = getProposalSendBlockers(reviewProposal(incomplete));
  const context = formatProposalSendBlockerContext(blockers, 2);

  assert.match(context, /terms and conditions/i);
  assert.match(context, /more/i);
  assert.match(context, /send is unavailable/i);
}

function main() {
  testSeededProposalIsNotReadyToSend();
  testReadyProposalShowsSendPrimaryAction();
  testIncompleteProposalShowsCompletePrimaryAction();
  testBlockerContextSummarizesMultipleItems();
  console.log("verify-proposal-send-readiness: all checks passed");
}

main();
