import type {
  AiReviewActionType,
  AiReviewCategory,
  AiReviewRecommendation,
  AiReviewSectionId,
  AiReviewSeverity,
  AiReviewSuggestedLineItem,
} from "@/lib/ai/ai-review-service";
import type { EstimateReviewAnalysis } from "@/lib/ai/internal/estimate-review-analyzer";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";

export type PreviousRecommendationRef = {
  id: string;
  title: string;
  category: AiReviewCategory;
};

export type RecommendationDraft = {
  id: string;
  section: AiReviewSectionId;
  category: AiReviewCategory;
  severity: AiReviewSeverity;
  title: string;
  explanation: string;
  reasoning: string;
  businessImpact: string;
  confidence: number;
  recommendedAction: string;
  actions: AiReviewActionType[];
  suggestedLineItem?: AiReviewSuggestedLineItem;
  relatedLineItemId?: string;
  suggestedUnitCost?: number;
  suggestedMarkupIncrease?: number;
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function materialSuggestion(description: string): AiReviewSuggestedLineItem {
  return {
    category: "materials",
    description,
    quantity: 1,
    unit: getDefaultUnitForCategory("materials"),
    unit_cost: 0,
  };
}

function laborSuggestion(description: string, hours = 8): AiReviewSuggestedLineItem {
  return {
    category: "labor",
    description,
    quantity: hours,
    unit: getDefaultUnitForCategory("labor"),
    unit_cost: 0,
  };
}

function wasPreviouslyFlagged(
  draft: RecommendationDraft,
  previous: PreviousRecommendationRef[]
) {
  return previous.some(
    (item) =>
      item.category === draft.category &&
      item.title.toLowerCase() === draft.title.toLowerCase()
  );
}

export function finalizeRecommendationDraft(
  draft: RecommendationDraft,
  previous: PreviousRecommendationRef[] = []
): AiReviewRecommendation {
  let confidence = draft.confidence;

  if (wasPreviouslyFlagged(draft, previous)) {
    confidence = clampConfidence(confidence + 12);
  }

  return {
    id: draft.id,
    section: draft.section,
    category: draft.category,
    severity: draft.severity,
    title: draft.title,
    explanation: draft.explanation,
    reasoning: draft.reasoning,
    businessImpact: draft.businessImpact,
    confidence: clampConfidence(confidence),
    recommendedAction: draft.recommendedAction,
    actions: draft.actions,
    suggestedLineItem: draft.suggestedLineItem,
    relatedLineItemId: draft.relatedLineItemId,
    suggestedUnitCost: draft.suggestedUnitCost,
    suggestedMarkupIncrease: draft.suggestedMarkupIncrease,
  };
}

export function buildContextualRecommendations(
  analysis: EstimateReviewAnalysis,
  state: EstimateBuilderState,
  previous: PreviousRecommendationRef[] = []
): AiReviewRecommendation[] {
  const drafts: RecommendationDraft[] = [];
  const { scopeSignals: signals } = analysis;

  const forgottenByProjectType: Record<
    EstimateReviewAnalysis["projectType"],
    Array<{
      id: string;
      title: string;
      explanation: string;
      businessImpact: string;
      description: string;
      confidence: number;
      trigger?: boolean;
    }>
  > = {
    commercial_ti: [
      {
        id: "ctx-ti-fire-caulk",
        title: "Fire caulking and penetration seals often missed on TI work",
        explanation:
          "Tenant improvement bids frequently omit firestop, putty pads, and penetration sealing on rated walls.",
        businessImpact:
          "Missing firestop scope is a common change-order on TI projects and can delay certificate of occupancy.",
        description: "Firestop / penetration seal allowance",
        confidence: 78,
      },
      {
        id: "ctx-ti-boxes-fittings",
        title: "Device boxes, mud rings, and MC connectors may be under-allowanced",
        explanation:
          "TI electrical work consumes significant quantities of boxes, connectors, and finish hardware beyond wire and conduit.",
        businessImpact:
          "Small hardware omissions erode margin on fast-track tenant projects with compressed buyout windows.",
        description: "Boxes, connectors & finish hardware allowance",
        confidence: 74,
      },
    ],
    new_construction: [
      {
        id: "ctx-nc-temp-power",
        title: "Temporary power and relocations commonly required on new construction",
        explanation:
          "New construction electrical bids often need temp panels, feeders, and relocation cycles before permanent service.",
        businessImpact:
          "GCs frequently treat temp power as electrical scope — omission leads to unpriced field work and schedule friction.",
        description: "Temporary power & relocation allowance",
        confidence: 82,
        trigger: !signals.hasTempPower,
      },
      {
        id: "ctx-nc-underground",
        title: "Underground duct bank or site conduit may be missing",
        explanation:
          "Site electrical scope is not visible in the estimate despite new construction project context.",
        businessImpact:
          "Underground scope gaps are high-dollar change-order drivers once civil and utility coordination begins.",
        description: "Site / underground conduit allowance",
        confidence: 70,
        trigger: !signals.hasUnderground,
      },
    ],
    healthcare: [
      {
        id: "ctx-hc-isolated-ground",
        title: "Critical branch / isolated ground accessories may be missing",
        explanation:
          "Healthcare projects often require additional labeling, redundant grounding, and critical circuit identification.",
        businessImpact:
          "Owner review and hospital compliance checks frequently surface missing critical power accessories after bid.",
        description: "Critical circuit labeling & grounding allowance",
        confidence: 76,
      },
    ],
    education: [
      {
        id: "ctx-edu-lab-accessories",
        title: "Lab / shop circuit accessories and labeling may be missing",
        explanation:
          "Education projects with vocational or science spaces often need additional disconnects, labeling, and specialty devices.",
        businessImpact:
          "District reviews commonly add device and labeling scope after bid comparison.",
        description: "Specialty device & labeling allowance",
        confidence: 68,
      },
    ],
    retail: [
      {
        id: "ctx-retail-controls",
        title: "Occupancy sensors and control devices may be missing",
        explanation:
          "Retail and restaurant scopes frequently include occupancy, timeclock, or dimming controls not visible in line items.",
        businessImpact:
          "Energy code and landlord standards often require controls that were not carried in the base bid.",
        description: "Occupancy / control device allowance",
        confidence: 72,
        trigger: signals.hasLighting && !signals.hasControls,
      },
    ],
    industrial: [
      {
        id: "ctx-ind-labels",
        title: "Equipment labeling and arc-flash related hardware may be missing",
        explanation:
          "Industrial bids often need engraved labels, warning signage, and lugs/connectors beyond base material takeoff.",
        businessImpact:
          "Plant turnover and safety audits frequently expose missing labeling scope after award.",
        description: "Equipment labeling & termination hardware",
        confidence: 75,
      },
    ],
    multifamily: [
      {
        id: "ctx-mf-common-area",
        title: "Common area and unit mix hardware may need separate allowance",
        explanation:
          "Multifamily bids can understate common area devices, corridor lighting, and unit mix variation.",
        businessImpact:
          "Unit count changes and common area RFIs often drive change orders when allowances are too thin.",
        description: "Common area electrical allowance",
        confidence: 69,
      },
    ],
    service_call: [],
    general_commercial: [
      {
        id: "ctx-gen-support-hardware",
        title: "Support hardware and fasteners are frequently missed",
        explanation:
          "Commercial estimates sometimes omit strut, unistrut, anchors, beam clamps, and fasteners from material takeoff.",
        businessImpact:
          "Buyout surprises on support hardware compress margin on otherwise competitive bids.",
        description: "Support hardware & fastener allowance",
        confidence: 71,
      },
    ],
  };

  for (const item of forgottenByProjectType[analysis.projectType]) {
    if (item.trigger === false) {
      continue;
    }

    drafts.push({
      id: item.id,
      section: "missing_materials",
      category: "missing_materials",
      severity: item.confidence >= 75 ? "warning" : "info",
      title: item.title,
      explanation: item.explanation,
      reasoning: `Project type (${analysis.projectTypeLabel}) and scope signals suggest this allowance is commonly omitted on similar work for ${analysis.customerName}.`,
      businessImpact: item.businessImpact,
      confidence: item.confidence,
      recommendedAction: "Add an allowance line or document the item as owner/GC furnished in notes.",
      actions: ["add_material", "ignore"],
      suggestedLineItem: materialSuggestion(item.description),
    });
  }

  if (
    analysis.laborToMaterialRatio !== null &&
    analysis.laborToMaterialRatio < 0.18 &&
    analysis.categoryTotals.materials > 5000 &&
    analysis.categoryTotals.labor > 0
  ) {
    drafts.push({
      id: "ctx-ratio-labor-light",
      section: "labor_review",
      category: "missing_labor",
      severity: "warning",
      title: "Labor appears light relative to material scope",
      explanation: `Labor is ${(analysis.laborToMaterialRatio * 100).toFixed(0)}% of material cost on a ${analysis.projectTypeLabel} project — below typical commercial ranges.`,
      reasoning:
        "Install-heavy scope with thin labor share often indicates missing rough-in, trim, or testing hours when viewed in full project context.",
      businessImpact:
        "Underpriced labor is a primary cause of post-award losses and change-order exposure on commercial electrical work.",
      confidence: 80,
      recommendedAction: "Validate labor hours against historical productivity for this project type and split by phase if needed.",
      actions: ["update_labor", "ignore"],
      suggestedLineItem: laborSuggestion("Additional installation labor — review hours"),
    });
  }

  if (
    analysis.laborHours > 0 &&
    analysis.sellPricePerLaborHour !== null &&
    analysis.sellPricePerLaborHour < 85 &&
    analysis.totals.finalSellingPrice > 15000
  ) {
    drafts.push({
      id: "ctx-labor-sell-per-hour-low",
      section: "labor_review",
      category: "pricing_concerns",
      severity: "warning",
      title: "Effective sell price per labor hour appears low",
      explanation: `Sell price per labor hour is about $${analysis.sellPricePerLaborHour.toFixed(0)} on a $${Math.round(analysis.totals.finalSellingPrice).toLocaleString()} bid.`,
      reasoning:
        "When viewed against total project value, labor may be carrying too much scope for the hours priced.",
      businessImpact:
        "Low realized labor rate on large bids often indicates missing burden, overtime, or supervision in the estimate.",
      confidence: 77,
      recommendedAction: "Review labor rates, burden, and hours against the full scope and schedule assumptions.",
      actions: ["update_labor", "update_unit", "ignore"],
    });
  }

  if (
    analysis.laborHours > 0 &&
    analysis.sellPricePerLaborHour !== null &&
    analysis.sellPricePerLaborHour > 250
  ) {
    drafts.push({
      id: "ctx-labor-sell-per-hour-high",
      section: "labor_review",
      category: "pricing_concerns",
      severity: "info",
      title: "Effective sell price per labor hour appears high",
      explanation: `Sell price per labor hour is about $${analysis.sellPricePerLaborHour.toFixed(0)}, which may reduce competitiveness.`,
      reasoning:
        "High sell per hour can be correct for specialty work, but on competitive commercial bids it warrants a competitiveness check.",
      businessImpact:
        "Overpriced labor can lose the bid; verify specialty craft, overtime, or foreman burden is intentional.",
      confidence: 65,
      recommendedAction: "Confirm labor hours and rates align with market and project schedule.",
      actions: ["update_labor", "ignore"],
    });
  }

  if (
    analysis.grossMarginPercent < 12 &&
    analysis.totals.finalSellingPrice > 20000
  ) {
    drafts.push({
      id: "ctx-margin-compressed",
      section: "pricing_margin",
      category: "low_margin",
      severity: analysis.grossMarginPercent < 8 ? "critical" : "warning",
      title: "Margin warning for project size and complexity",
      explanation: `Gross margin is ${analysis.grossMarginPercent.toFixed(1)}% on a ${analysis.complexity.level}-complexity ${analysis.projectTypeLabel} bid for ${analysis.customerName}.`,
      reasoning:
        "Margin should be evaluated against project type, customer history, and estimate complexity — not line items alone.",
      businessImpact:
        "Thin margin on complex commercial work leaves little room for RFIs, escalation, and productivity variance.",
      confidence: 88,
      recommendedAction: "Increase markup, reduce direct cost, or document risk assumptions before sending the proposal.",
      actions: ["increase_markup", "ignore"],
      suggestedMarkupIncrease: analysis.grossMarginPercent < 8 ? 5 : 3,
    });
  }

  if (
    analysis.complexity.level === "high" &&
    analysis.contingencyPercent < 4 &&
    analysis.totals.directCost > 25000
  ) {
    drafts.push({
      id: "ctx-change-order-contingency",
      section: "scope_review",
      category: "scope_gaps",
      severity: "warning",
      title: "Change-order risk: contingency appears low for estimate complexity",
      explanation: `Complexity score is ${analysis.complexity.score}/100 but contingency is only ${analysis.contingencyPercent}%.`,
      reasoning: analysis.complexity.factors.join("; "),
      businessImpact:
        "High-complexity bids without adequate contingency often convert field surprises into unrecoverable change orders.",
      confidence: 84,
      recommendedAction: "Increase contingency or document explicit exclusions for high-risk scope areas.",
      actions: ["ignore"],
    });
  }

  if (
    !analysis.notesPresent &&
    analysis.totals.finalSellingPrice > 20000 &&
    analysis.complexity.level !== "low"
  ) {
    drafts.push({
      id: "ctx-change-order-assumptions",
      section: "scope_review",
      category: "scope_gaps",
      severity: "warning",
      title: "Potential change-order risk: assumptions not documented",
      explanation:
        "A complex bid for this customer lacks notes covering exclusions, alternates, and responsibilities.",
      reasoning:
        "Undocumented assumptions on commercial work frequently become disputes after award.",
      businessImpact:
        "Missing assumptions expose the contractor to scope creep and unpaid extra work.",
      confidence: 86,
      recommendedAction: "Document assumptions, exclusions, and owner/GC furnished items before proposal issue.",
      actions: ["ignore"],
    });
  }

  if (
    (signals.hasPanelWork || signals.hasSwitchgear) &&
    !signals.hasTestingLanguage
  ) {
    drafts.push({
      id: "ctx-testing-commissioning",
      section: "questions",
      category: "estimator_questions",
      severity: "warning",
      title: "Testing and commissioning reminder for distribution scope",
      explanation:
        "Panel or switchgear scope is present without visible testing, startup, or commissioning labor.",
      reasoning:
        "Commercial distribution work typically requires IR scan, functional testing, and startup coordination.",
      businessImpact:
        "Missing testing labor is a frequent buyout shortfall and can delay energization.",
      confidence: 83,
      recommendedAction: "Add testing/startup labor or confirm it is included in subcontract scope.",
      actions: ["update_labor", "ignore"],
      suggestedLineItem: laborSuggestion("Testing, IR scan & startup labor", 16),
    });
  }

  if (
    analysis.totals.finalSellingPrice > 15000 &&
    !signals.hasPermitLanguage
  ) {
    drafts.push({
      id: "ctx-permit-inspection",
      section: "questions",
      category: "estimator_questions",
      severity: "info",
      title: "Permit and inspection reminder",
      explanation:
        "No permit fees, inspection trips, or rework allowance is visible on this commercial estimate.",
      reasoning:
        "Permit responsibility and re-inspection costs vary by jurisdiction and should be confirmed in context.",
      businessImpact:
        "Unpriced permit and inspection scope erodes margin and causes billing disputes with the GC.",
      confidence: 79,
      recommendedAction: "Clarify permit fees, inspection trips, and rework allowance with the GC.",
      actions: ["ignore"],
    });
  }

  if (
    (signals.hasDemo || analysis.projectType === "commercial_ti") &&
    !signals.hasCleanupLanguage
  ) {
    drafts.push({
      id: "ctx-cleanup-disposal",
      section: "missing_materials",
      category: "missing_materials",
      severity: "info",
      title: "Cleanup and disposal items may be missing",
      explanation:
        "Demo or tenant improvement scope is suggested, but cleanup, debris removal, or disposal is not visible.",
      reasoning:
        "Field crews often incur dumpster, cleanup, and disposal costs that were not carried in the bid.",
      businessImpact:
        "Cleanup omissions compress field margin and are rarely recovered once the job is underway.",
      confidence: 73,
      recommendedAction: "Add cleanup/disposal allowance or document as GC responsibility.",
      actions: ["add_material", "ignore"],
      suggestedLineItem: materialSuggestion("Cleanup, disposal & dumpster allowance"),
    });
  }

  if (signals.hasConduitWork && signals.hasWirePull) {
    const missingAccessories = !analysis.scopeText.includes("strap") &&
      !analysis.scopeText.includes("hanger") &&
      !analysis.scopeText.includes("connector");

    if (missingAccessories) {
      drafts.push({
        id: "ctx-conduit-accessories",
        section: "missing_materials",
        category: "missing_materials",
        severity: "info",
        title: "Conduit support and connector hardware may be missing",
        explanation:
          "Conduit and wire scope is present without obvious allowances for straps, hangers, connectors, or couplings.",
        reasoning:
          "Accessory quantities are a common takeoff miss on conduit-heavy commercial projects.",
        businessImpact:
          "Hardware buyout gaps reduce margin on material-intensive bids.",
        confidence: 70,
        recommendedAction: "Verify connector, coupling, and support hardware are included in material takeoff.",
        actions: ["add_material", "ignore"],
        suggestedLineItem: materialSuggestion("Conduit connectors, couplings & supports"),
      });
    }
  }

  const filtered = drafts;

  return filtered
    .map((draft) => finalizeRecommendationDraft(draft, previous))
    .sort((a, b) => b.confidence - a.confidence || severityRank(a.severity) - severityRank(b.severity));
}

function severityRank(severity: AiReviewSeverity) {
  return { critical: 0, warning: 1, info: 2 }[severity];
}

export function enrichLegacyRecommendation(
  recommendation: AiReviewRecommendation,
  analysis: EstimateReviewAnalysis
): AiReviewRecommendation {
  const confidence =
    recommendation.severity === "critical" ? 85
    : recommendation.severity === "warning" ? 72
    : 58;

  const businessImpact =
    recommendation.businessImpact?.trim() ?
      recommendation.businessImpact
    : defaultBusinessImpact(recommendation.category, analysis);

  return {
    ...recommendation,
    confidence: recommendation.confidence ?? confidence,
    businessImpact,
  };
}

function defaultBusinessImpact(
  category: AiReviewCategory,
  analysis: EstimateReviewAnalysis
): string {
  switch (category) {
    case "missing_materials":
      return `Unpriced material on a $${Math.round(analysis.totals.finalSellingPrice).toLocaleString()} ${analysis.projectTypeLabel} bid reduces buyout accuracy and field margin.`;
    case "missing_labor":
      return "Missing labor hours increases the risk of performing work below cost on this project.";
    case "duplicate_items":
      return "Duplicate lines can inflate the sell price and undermine customer confidence during review.";
    case "pricing_concerns":
      return "Pricing inconsistencies can cause bid loss or unrecoverable buyout variance.";
    case "low_margin":
      return "Low margin leaves limited buffer for RFIs, schedule disruption, and material escalation.";
    case "scope_gaps":
      return "Scope gaps frequently become change orders after award, especially on complex commercial work.";
    case "estimator_questions":
      return "Unresolved assumptions before proposal issue increase dispute risk with the customer.";
  }
}
