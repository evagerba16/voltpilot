import {
  analyzeEstimateReviewContext,
  serializeAnalysisForPrompt,
  type EstimateReviewAnalysis,
} from "@/lib/ai/internal/estimate-review-analyzer";
import {
  buildContextualRecommendations,
  enrichLegacyRecommendation,
  type PreviousRecommendationRef,
} from "@/lib/ai/internal/contextual-review-engine";
import { getOpenAIClient } from "@/lib/ai/client";
import { getOpenAIConfig } from "@/lib/ai/env";
import { parseJsonResponse } from "@/lib/ai/parse-json";
import type { EstimateReviewContext } from "@/lib/ai/types";
import { calculateEstimateTotals } from "@/lib/estimates/calculations";
import {
  reviewEstimate,
  type ReviewSuggestion,
  type ReviewSuggestionCategory,
} from "@/lib/estimates/review";
import type {
  EstimateBuilderState,
  EstimateCategory,
  EstimateLineItemInput,
} from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";

export type AiReviewSource = "rules" | "openai" | "hybrid";

export type AiReviewCategory =
  | "missing_materials"
  | "missing_labor"
  | "duplicate_items"
  | "pricing_concerns"
  | "low_margin"
  | "scope_gaps"
  | "estimator_questions";

export type AiReviewSectionId =
  | "missing_materials"
  | "labor_review"
  | "pricing_margin"
  | "scope_review"
  | "questions"
  | "overall_health";

export type AiReviewSeverity = "info" | "warning" | "critical";

export type AiReviewActionType =
  | "add_material"
  | "update_labor"
  | "update_unit"
  | "increase_markup"
  | "ignore";

export type AiReviewSuggestedLineItem = {
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
};

export type AiReviewRecommendation = {
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

export type AiReviewHealthStatus = "ready" | "review_required" | "not_ready";

export type AiReviewHealth = {
  score: number;
  status: AiReviewHealthStatus;
  headline: string;
  highlights: string[];
};

export type AiReviewSection = {
  id: AiReviewSectionId;
  label: string;
  emoji: string;
  recommendations: AiReviewRecommendation[];
  emptyMessage: string;
};

export type AiReviewResult = {
  recommendations: AiReviewRecommendation[];
  sections: AiReviewSection[];
  health: AiReviewHealth;
  analysis: EstimateReviewAnalysis;
  summary: string;
  reviewedAt: string;
  source: AiReviewSource;
  aiEnabled: boolean;
  stats: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
};

export type AiReviewPayload = {
  state: EstimateBuilderState;
  context: EstimateReviewContext;
  previousRecommendations?: PreviousRecommendationRef[];
};

export const AI_REVIEW_SECTION_META: Record<
  Exclude<AiReviewSectionId, "overall_health">,
  { label: string; emoji: string; emptyMessage: string }
> = {
  missing_materials: {
    label: "Missing Materials",
    emoji: "⚠️",
    emptyMessage: "No missing material allowances flagged.",
  },
  labor_review: {
    label: "Labor Review",
    emoji: "👷",
    emptyMessage: "Labor hours and rates look reasonable for this scope.",
  },
  pricing_margin: {
    label: "Pricing & Margin",
    emoji: "💰",
    emptyMessage: "No pricing or margin concerns flagged.",
  },
  scope_review: {
    label: "Scope Review",
    emoji: "📋",
    emptyMessage: "No duplicate lines or scope gaps detected.",
  },
  questions: {
    label: "Questions",
    emoji: "❓",
    emptyMessage: "No open questions before proposal issue.",
  },
};

export const AI_REVIEW_CATEGORY_LABELS: Record<AiReviewCategory, string> = {
  missing_materials: "Missing materials",
  missing_labor: "Missing labor",
  duplicate_items: "Duplicate items",
  pricing_concerns: "Pricing concerns",
  low_margin: "Low profit margin",
  scope_gaps: "Scope gap",
  estimator_questions: "Estimator question",
};

const REVIEW_SECTION_ORDER: Exclude<AiReviewSectionId, "overall_health">[] = [
  "missing_materials",
  "labor_review",
  "pricing_margin",
  "scope_review",
  "questions",
];

const VALID_CATEGORIES = new Set<AiReviewCategory>([
  "missing_materials",
  "missing_labor",
  "duplicate_items",
  "pricing_concerns",
  "low_margin",
  "scope_gaps",
  "estimator_questions",
]);

const VALID_SECTIONS = new Set<AiReviewSectionId>([
  "missing_materials",
  "labor_review",
  "pricing_margin",
  "scope_review",
  "questions",
  "overall_health",
]);

const VALID_SEVERITIES = new Set<AiReviewSeverity>(["info", "warning", "critical"]);

const VALID_ACTIONS = new Set<AiReviewActionType>([
  "add_material",
  "update_labor",
  "update_unit",
  "increase_markup",
  "ignore",
]);

type AiReviewJsonPayload = {
  summary?: string;
  recommendations?: Array<{
    section?: string;
    category?: string;
    severity?: string;
    title?: string;
    explanation?: string;
    reasoning?: string;
    confidence?: number;
    businessImpact?: string;
    recommendedAction?: string;
    actions?: string[];
    suggestedLineItem?: Partial<AiReviewSuggestedLineItem>;
    relatedLineItemId?: string;
    suggestedUnitCost?: number;
    suggestedMarkupIncrease?: number;
  }>;
};

function sectionForCategory(category: AiReviewCategory): AiReviewSectionId {
  switch (category) {
    case "missing_materials":
      return "missing_materials";
    case "missing_labor":
      return "labor_review";
    case "pricing_concerns":
    case "low_margin":
      return "pricing_margin";
    case "duplicate_items":
    case "scope_gaps":
      return "scope_review";
    case "estimator_questions":
      return "questions";
  }
}

function mapLegacyCategory(category: ReviewSuggestionCategory): AiReviewCategory {
  switch (category) {
    case "missing_materials":
      return "missing_materials";
    case "missing_labor":
    case "unusual_labor":
      return "missing_labor";
    case "duplicate_items":
      return "duplicate_items";
    case "inconsistent_pricing":
      return "pricing_concerns";
    case "low_margin":
      return "low_margin";
    case "estimating_risks":
    case "suggested_items":
      return "scope_gaps";
    case "pre_proposal":
      return "scope_gaps";
    default:
      return "estimator_questions";
  }
}

function defaultActions(category: AiReviewCategory): AiReviewActionType[] {
  switch (category) {
    case "missing_materials":
    case "scope_gaps":
      return ["add_material", "ignore"];
    case "missing_labor":
      return ["update_labor", "ignore"];
    case "duplicate_items":
      return ["ignore"];
    case "pricing_concerns":
      return ["update_unit", "ignore"];
    case "low_margin":
      return ["increase_markup", "ignore"];
    case "estimator_questions":
      return ["ignore"];
  }
}

function defaultRecommendedAction(category: AiReviewCategory): string {
  switch (category) {
    case "missing_materials":
      return "Add a material line for the missing scope or verify it is included elsewhere.";
    case "missing_labor":
      return "Add or update labor hours and rates for installation, testing, or supervision.";
    case "duplicate_items":
      return "Consolidate duplicate lines or confirm both entries are intentional.";
    case "pricing_concerns":
      return "Verify unit costs, units of measure, and vendor quotes for this scope.";
    case "low_margin":
      return "Increase markup or reduce direct cost before marking the estimate final.";
    case "scope_gaps":
      return "Add the missing scope item or document it as an explicit exclusion.";
    case "estimator_questions":
      return "Confirm scope assumptions with the project team before bidding.";
  }
}

function defaultReasoning(category: AiReviewCategory): string {
  switch (category) {
    case "missing_materials":
      return "Installed electrical scope typically requires matching material allowances. Labor or equipment references without material lines often indicate a buyout gap.";
    case "missing_labor":
      return "Self-performed work needs burdened labor hours. Equipment and material lines without labor can understate field cost and schedule risk.";
    case "duplicate_items":
      return "Repeated descriptions in the same category can double-count quantity or confuse reviewers during buyout and proposal issue.";
    case "pricing_concerns":
      return "Unit cost outliers or mismatched units of measure are common sources of bid loss and change-order exposure on commercial work.";
    case "low_margin":
      return "Lean overhead, contingency, or profit leaves little room for RFIs, escalation, and productivity variance on commercial electrical projects.";
    case "scope_gaps":
      return "Common commercial electrical scopes are often omitted when line items are rolled up too aggressively or assumptions are undocumented.";
    case "estimator_questions":
      return "Senior estimators confirm field assumptions, responsibilities, and exclusions before a proposal goes to the customer.";
  }
}

function inferSuggestedLineItem(
  category: AiReviewCategory,
  title: string
): AiReviewSuggestedLineItem | undefined {
  if (category === "missing_materials" || category === "scope_gaps") {
    const keywordMatch = title.match(/"([^"]+)"/);
    const description = keywordMatch?.[1]
      ? `${keywordMatch[1]} allowance`
      : "Scope allowance — review before sending";

    return {
      category: "materials",
      description,
      quantity: 1,
      unit: getDefaultUnitForCategory("materials"),
      unit_cost: 0,
    };
  }

  if (category === "missing_labor") {
    return {
      category: "labor",
      description:
        title.toLowerCase().includes("equipment") ?
          "Equipment installation & terminations"
        : "Installation labor",
      quantity: 8,
      unit: getDefaultUnitForCategory("labor"),
      unit_cost: 0,
    };
  }

  return undefined;
}

function findRelatedLaborLineId(
  state: EstimateBuilderState,
  title: string
): string | undefined {
  const match = title.match(/"([^"]+)"/);
  const needle = match?.[1]?.toLowerCase();

  if (!needle) {
    return undefined;
  }

  const laborLine = state.line_items.find(
    (item) =>
      item.category === "labor" &&
      item.description.toLowerCase().includes(needle)
  );

  return laborLine?.id;
}

function fromLegacySuggestion(
  suggestion: ReviewSuggestion,
  state: EstimateBuilderState
): AiReviewRecommendation {
  const category = mapLegacyCategory(suggestion.category);
  const section = sectionForCategory(category);
  const relatedLineItemId =
    category === "missing_labor" || category === "pricing_concerns"
      ? findRelatedLaborLineId(state, suggestion.title)
      : undefined;

  return {
    id: suggestion.id,
    section,
    category,
    severity: suggestion.severity,
    title: suggestion.title,
    explanation: suggestion.description,
    reasoning: defaultReasoning(category),
    businessImpact: "",
    confidence: 0,
    recommendedAction: defaultRecommendedAction(category),
    actions: defaultActions(category),
    suggestedLineItem: inferSuggestedLineItem(category, suggestion.title),
    relatedLineItemId,
    suggestedMarkupIncrease:
      category === "low_margin" ? 3 : undefined,
  };
}

function activeLineItems(items: EstimateLineItemInput[]) {
  return items.filter(
    (item) =>
      item.description.trim() || item.quantity > 0 || item.unit_cost > 0
  );
}

function buildScopeGaps(
  state: EstimateBuilderState,
  totals: ReturnType<typeof calculateEstimateTotals>
): AiReviewRecommendation[] {
  const gaps: AiReviewRecommendation[] = [];
  const items = activeLineItems(state.line_items);
  const textBlob = items.map((item) => item.description.toLowerCase()).join(" ");

  const scopeChecks: Array<{
    id: string;
    trigger: boolean;
    severity: AiReviewSeverity;
    title: string;
    explanation: string;
    reasoning: string;
    businessImpact: string;
    confidence: number;
    recommendedAction: string;
    suggestedDescription?: string;
  }> = [
    {
      id: "scope-fire-alarm",
      trigger:
        (textBlob.includes("fire alarm") || textBlob.includes("facp")) &&
        !textBlob.includes("device") &&
        !textBlob.includes("pull") &&
        !textBlob.includes("smoke"),
      severity: "warning",
      title: "Fire alarm scope may be incomplete",
      explanation:
        "Fire alarm is referenced but device-level material or labor detail is not visible.",
      reasoning:
        "FACP-only bids often omit devices, circuits, and testing labor — a common source of buyout shortfall.",
      businessImpact:
        "Incomplete fire alarm scope frequently becomes a high-value change order at inspection.",
      confidence: 81,
      recommendedAction:
        "Break out devices, wire, and acceptance testing or document as exclusion.",
      suggestedDescription: "Fire alarm devices & circuits allowance",
    },
    {
      id: "scope-temp-power",
      trigger:
        totals.finalSellingPrice > 20000 &&
        (textBlob.includes("new") ||
          textBlob.includes("construction") ||
          textBlob.includes("build-out")) &&
        !textBlob.includes("temp") &&
        !textBlob.includes("temporary"),
      severity: "info",
      title: "Is temporary power included?",
      explanation:
        "New construction or build-out scope without a temp power allowance.",
      reasoning:
        "GCs often expect temp panels, feeders, and relocation cycles in the electrical bid.",
      businessImpact:
        "Temp power omissions create schedule delays and unpriced field labor.",
      confidence: 76,
      recommendedAction:
        "Add temp power allowance or confirm it is owner/GC furnished.",
      suggestedDescription: "Temporary power & relocation",
    },
    {
      id: "scope-as-built",
      trigger:
        totals.finalSellingPrice > 30000 &&
        !textBlob.includes("as-built") &&
        !textBlob.includes("as built") &&
        !textBlob.includes("record drawing"),
      severity: "info",
      title: "Are as-built deliverables included?",
      explanation:
        "Large commercial bids often require red-line and record drawing closeout.",
      reasoning:
        "Closeout labor is frequently missed when only rough-in and trim are priced.",
      businessImpact:
        "Missing closeout scope compresses margin at project turnover.",
      confidence: 72,
      recommendedAction:
        "Add closeout labor or note as-built scope in assumptions.",
      suggestedDescription: "As-built & closeout labor",
    },
    {
      id: "scope-comm-raceway",
      trigger:
        textBlob.includes("data") ||
        (textBlob.includes("low voltage") && !textBlob.includes("conduit")),
      severity: "info",
      title: "Low-voltage pathway scope may be missing",
      explanation:
        "Low-voltage or data scope is present without obvious pathway or support material.",
      reasoning:
        "Pathway, backing, and firestopping are often split between trades — clarify responsibility.",
      businessImpact:
        "Pathway disputes between trades commonly surface as change orders during install.",
      confidence: 70,
      recommendedAction:
        "Add pathway allowance or document as by others in notes.",
      suggestedDescription: "Low-voltage pathway allowance",
    },
  ];

  for (const check of scopeChecks) {
    if (!check.trigger) {
      continue;
    }

    gaps.push({
      id: check.id,
      section: "scope_review",
      category: "scope_gaps",
      severity: check.severity,
      title: check.title,
      explanation: check.explanation,
      reasoning: check.reasoning,
      businessImpact: check.businessImpact,
      confidence: check.confidence,
      recommendedAction: check.recommendedAction,
      actions: ["add_material", "ignore"],
      suggestedLineItem: check.suggestedDescription
        ? {
            category: "materials",
            description: check.suggestedDescription,
            quantity: 1,
            unit: getDefaultUnitForCategory("materials"),
            unit_cost: 0,
          }
        : undefined,
    });
  }

  if (activeLineItems(state.line_items).length < 4 && totals.finalSellingPrice > 10000) {
    gaps.push({
      id: "scope-under-detailed",
      section: "scope_review",
      category: "scope_gaps",
      severity: "warning",
      title: "Estimate may be under-detailed for bid size",
      explanation:
        "The sell price is meaningful but line-item detail is sparse.",
      reasoning:
        "Rolled-up bids are harder to defend in review and increase the chance of missed scope at buyout.",
      businessImpact:
        "Under-detailed bids increase change-order risk and weaken internal review quality.",
      confidence: 85,
      recommendedAction:
        "Break out major systems, areas, or phases before sending the proposal.",
      actions: ["ignore"],
    });
  }

  return gaps.slice(0, 5);
}

function buildEstimatorQuestions(
  state: EstimateBuilderState,
  totals: ReturnType<typeof calculateEstimateTotals>
): AiReviewRecommendation[] {
  const questions: AiReviewRecommendation[] = [];
  const items = activeLineItems(state.line_items);
  const textBlob = items.map((item) => item.description.toLowerCase()).join(" ");
  const laborItems = items.filter((item) => item.category === "labor");

  const addQuestion = (
    id: string,
    severity: AiReviewSeverity,
    title: string,
    explanation: string,
    reasoning: string,
    businessImpact: string,
    recommendedAction: string,
    confidence: number,
    actions: AiReviewActionType[] = ["ignore"]
  ) => {
    questions.push({
      id,
      section: "questions",
      category: "estimator_questions",
      severity,
      title,
      explanation,
      reasoning,
      businessImpact,
      confidence,
      recommendedAction,
      actions,
    });
  };

  if (totals.finalSellingPrice > 25000 && !state.notes.trim()) {
    addQuestion(
      "question-assumptions",
      "warning",
      "Are assumptions and exclusions documented?",
      "This is a sizable bid without notes. Document allowances, alternates, and exclusions before proposal issue.",
      "Proposal disputes often trace back to undocumented assumptions on commercial electrical work.",
      "Missing assumptions increase dispute risk and change-order exposure after award.",
      "Add assumptions for existing conditions, owner-furnished equipment, and permit responsibility.",
      82
    );
  }

  if (
    (textBlob.includes("panel") ||
      textBlob.includes("switchgear") ||
      textBlob.includes("transformer")) &&
    !textBlob.includes("test") &&
    !textBlob.includes("commission")
  ) {
    addQuestion(
      "question-testing",
      "info",
      "Is testing and startup labor included?",
      "Distribution equipment is present but testing/commissioning scope is not obvious in line items.",
      "Switchgear and panel projects typically require IR, functional testing, and startup coordination.",
      "Missing testing labor delays energization and often becomes unpriced field work.",
      "Confirm IR scan, functional testing, and startup are covered in labor or subcontract scope.",
      80,
      ["update_labor", "ignore"]
    );
  }

  if (
    totals.finalSellingPrice > 15000 &&
    !textBlob.includes("permit") &&
    !textBlob.includes("inspect")
  ) {
    addQuestion(
      "question-permits",
      "info",
      "Who is responsible for permits and inspections?",
      "No permit or inspection allowance is visible on this commercial electrical estimate.",
      "Permit fees and re-inspection trips vary by jurisdiction and can erode margin if not clarified.",
      "Unpriced permit scope reduces net margin and creates billing friction with the GC.",
      "Clarify permit fees, inspection trips, and rework allowance with the GC.",
      78
    );
  }

  if (items.length >= 3 && laborItems.length === 1 && totals.directCost > 15000) {
    addQuestion(
      "question-labor-breakdown",
      "info",
      "Should labor be broken out by phase or area?",
      "A single labor line on a multi-scope bid can hide buyout and productivity risk during review.",
      "Phase-based labor helps the team validate hours and compare against historical productivity.",
      "Poor labor visibility increases the chance of underpriced field hours on complex projects.",
      "Split rough-in, trim, and testing labor so the team can validate hours by phase.",
      74,
      ["update_labor", "ignore"]
    );
  }

  return questions.slice(0, 5);
}

function enrichRecommendationForResponse(
  recommendation: AiReviewRecommendation
): AiReviewRecommendation {
  const reasoning =
    recommendation.businessImpact.trim() ?
      `${recommendation.reasoning}\n\nBusiness impact: ${recommendation.businessImpact}`
    : recommendation.reasoning;

  return {
    ...recommendation,
    reasoning,
  };
}

function buildRulesReview(payload: AiReviewPayload): {
  recommendations: AiReviewRecommendation[];
  analysis: EstimateReviewAnalysis;
} {
  const analysis = analyzeEstimateReviewContext(payload.state, payload.context);
  const previous = payload.previousRecommendations ?? [];
  const legacy = reviewEstimate(payload.state);

  const converted = legacy.suggestions.map((item) =>
    enrichLegacyRecommendation(
      fromLegacySuggestion(item, payload.state),
      analysis
    )
  );

  const contextual = buildContextualRecommendations(
    analysis,
    payload.state,
    previous
  );

  const scopeGaps = buildScopeGaps(payload.state, analysis.totals).map((item) =>
    enrichLegacyRecommendation(
      {
        ...item,
        confidence: item.confidence || 70,
        businessImpact: item.businessImpact || "",
      },
      analysis
    )
  );

  const questions = buildEstimatorQuestions(payload.state, analysis.totals).map(
    (item) =>
      enrichLegacyRecommendation(
        {
          ...item,
          confidence: item.confidence || 65,
          businessImpact: item.businessImpact || "",
        },
        analysis
      )
  );

  const merged = new Map<string, AiReviewRecommendation>();

  for (const item of [...converted, ...contextual, ...scopeGaps, ...questions]) {
    const key = `${item.section}:${item.category}:${item.title.toLowerCase()}`;
    const existing = merged.get(key);

    if (!existing || item.confidence > existing.confidence) {
      merged.set(key, item);
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };

  const recommendations = Array.from(merged.values()).sort((a, b) => {
    const severityDiff = severityRank[a.severity] - severityRank[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return b.confidence - a.confidence;
  });

  return { recommendations, analysis };
}

function buildStats(recommendations: AiReviewRecommendation[]) {
  return {
    critical: recommendations.filter((item) => item.severity === "critical").length,
    warning: recommendations.filter((item) => item.severity === "warning").length,
    info: recommendations.filter((item) => item.severity === "info").length,
    total: recommendations.length,
  };
}

function buildHealth(
  recommendations: AiReviewRecommendation[],
  analysis: EstimateReviewAnalysis
): AiReviewHealth {
  const stats = buildStats(recommendations);
  let score = 100;

  for (const item of recommendations) {
    const weight = item.confidence / 100;
    if (item.severity === "critical") {
      score -= 22 * weight;
    } else if (item.severity === "warning") {
      score -= 10 * weight;
    } else {
      score -= 3 * weight;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const highlights: string[] = [];

  if (stats.critical > 0) {
    highlights.push(
      `${stats.critical} critical finding(s) should be resolved before the proposal is sent.`
    );
  }

  if (stats.warning > 0) {
    highlights.push(
      `${stats.warning} warning(s) on scope, pricing, or margin need estimator review.`
    );
  }

  const missingMaterials = recommendations.filter(
    (item) => item.section === "missing_materials"
  ).length;
  const laborIssues = recommendations.filter(
    (item) => item.section === "labor_review"
  ).length;
  const pricingIssues = recommendations.filter(
    (item) => item.section === "pricing_margin"
  ).length;

  if (missingMaterials > 0) {
    highlights.push(`${missingMaterials} material allowance gap(s) flagged.`);
  }

  if (laborIssues > 0) {
    highlights.push(`${laborIssues} labor review note(s) flagged.`);
  }

  if (pricingIssues > 0) {
    highlights.push(`${pricingIssues} pricing or margin concern(s) flagged.`);
  }

  if (highlights.length === 0) {
    highlights.push(
      "Line items, labor, and margin passed senior review checks.",
      "Confirm exclusions, alternates, and field conditions before sending."
    );
  }

  if (analysis.complexity.level === "high") {
    highlights.push(
      `High-complexity ${analysis.projectTypeLabel} bid — allow extra review time before sending.`
    );
  }

  if (
    analysis.laborToMaterialRatio !== null &&
    analysis.laborToMaterialRatio < 0.2 &&
    analysis.categoryTotals.materials > 5000
  ) {
    highlights.push("Labor-to-material ratio is lean for this scope profile.");
  }

  let status: AiReviewHealthStatus = "ready";
  let headline = "Estimate is in good shape for proposal issue.";

  if (stats.critical > 0 || score < 55) {
    status = "not_ready";
    headline = "Not ready to send — critical issues require attention.";
  } else if (stats.warning > 0 || score < 82) {
    status = "review_required";
    headline = "Review recommended before sending to the customer.";
  }

  return { score, status, headline, highlights };
}

function buildSections(
  recommendations: AiReviewRecommendation[]
): AiReviewSection[] {
  return REVIEW_SECTION_ORDER.map((sectionId) => {
    const meta = AI_REVIEW_SECTION_META[sectionId];
    const sectionRecommendations = recommendations.filter(
      (item) => item.section === sectionId
    );

    return {
      id: sectionId,
      label: meta.label,
      emoji: meta.emoji,
      recommendations: sectionRecommendations,
      emptyMessage: meta.emptyMessage,
    };
  });
}

function buildSummary(
  recommendations: AiReviewRecommendation[],
  health: AiReviewHealth,
  analysis: EstimateReviewAnalysis,
  aiSummary?: string
) {
  if (aiSummary?.trim()) {
    return aiSummary.trim();
  }

  if (health.status === "not_ready") {
    return `${health.headline} ${analysis.projectTypeLabel} · ${analysis.customerName}.`;
  }

  if (health.status === "review_required") {
    return `${health.headline} ${recommendations.length} contextual finding(s) for this ${analysis.projectTypeLabel} estimate.`;
  }

  if (recommendations.length === 0) {
    return `Senior review complete for ${analysis.projectName}. No major issues detected — verify exclusions and allowances before sending.`;
  }

  return `${recommendations.length} contextual review note(s) for ${analysis.customerName}. Scope profile: ${analysis.projectTypeLabel}, complexity ${analysis.complexity.level}.`;
}

function buildOpenAiPrompt(
  payload: AiReviewPayload,
  analysis: EstimateReviewAnalysis
) {
  const lineItems = activeLineItems(payload.state.line_items)
    .map(
      (item) =>
        `- [${item.id}] [${item.category}] ${item.description || "(no description)"} | qty ${item.quantity} ${item.unit} @ $${item.unit_cost}`
    )
    .join("\n");

  const previous =
    payload.previousRecommendations?.length ?
      payload.previousRecommendations
        .map((item) => `- ${item.category}: ${item.title}`)
        .join("\n")
    : "None";

  return `You are a senior commercial electrical estimator reviewing a bid in full project context before it goes to the customer.

Project analysis:
${serializeAnalysisForPrompt(analysis)}

Customer: ${analysis.customerName}
Project: ${analysis.projectName}
Type: ${analysis.projectTypeLabel}
Location: ${payload.context.projectAddress ?? "Not specified"}

Estimate: ${payload.state.title}
Overhead ${analysis.overheadPercent}% | Contingency ${analysis.contingencyPercent}% | Profit ${analysis.profitMarginSetting}% 
Direct cost $${analysis.totals.directCost.toFixed(0)} | Sell $${analysis.totals.finalSellingPrice.toFixed(0)} | Margin ${analysis.grossMarginPercent.toFixed(1)}%
Labor hours ${analysis.laborHours} | Labor/material ratio ${analysis.laborToMaterialRatio?.toFixed(2) ?? "n/a"}
Complexity ${analysis.complexity.level} (${analysis.complexity.score}/100)

Line items:
${lineItems || "(none)"}

Notes: ${payload.state.notes || "(none)"}

Previously flagged recommendations:
${previous}

Return JSON only:
{
  "summary": "1-2 sentence senior estimator summary referencing project context",
  "recommendations": [
    {
      "section": "missing_materials|labor_review|pricing_margin|scope_review|questions",
      "category": "missing_materials|missing_labor|duplicate_items|pricing_concerns|low_margin|scope_gaps|estimator_questions",
      "severity": "info|warning|critical",
      "confidence": 0,
      "title": "Short finding title",
      "explanation": "What was found on this bid",
      "reasoning": "Why an experienced estimator would flag this in context",
      "businessImpact": "Commercial impact if ignored",
      "recommendedAction": "What the estimator should do next",
      "actions": ["add_material|update_labor|update_unit|increase_markup|ignore"],
      "relatedLineItemId": "optional line item id from list",
      "suggestedUnitCost": 0,
      "suggestedMarkupIncrease": 3,
      "suggestedLineItem": {
        "category": "materials|labor|equipment|subcontractors|miscellaneous",
        "description": "optional suggested line description",
        "quantity": 1,
        "unit": "ea|hrs",
        "unit_cost": 0
      }
    }
  ]
}

Analyze the entire project scope (not just individual lines) for:
- Materials commonly forgotten for this project type
- Labor that appears too low or too high relative to scope and sell price
- Scope gaps and change-order risks
- Margin warnings given complexity and customer context
- Permit, inspection, testing, commissioning, cleanup, and accessory/hardware omissions

Return 6-14 high-value recommendations with confidence 0-100. Recommendations only — never auto-edit the estimate.`;
}

function normalizeAiRecommendations(
  payload: AiReviewJsonPayload | null,
  analysis: EstimateReviewAnalysis
): AiReviewRecommendation[] {
  if (!payload?.recommendations?.length) {
    return [];
  }

  return payload.recommendations.flatMap((item, index) => {
    const category = VALID_CATEGORIES.has(item.category as AiReviewCategory)
      ? (item.category as AiReviewCategory)
      : "estimator_questions";
    const section =
      item.section && VALID_SECTIONS.has(item.section as AiReviewSectionId)
        ? (item.section as AiReviewSectionId)
        : sectionForCategory(category);

    if (section === "overall_health") {
      return [];
    }

    const severity = VALID_SEVERITIES.has(item.severity as AiReviewSeverity)
      ? (item.severity as AiReviewSeverity)
      : "info";

    if (!item.title?.trim() || !item.explanation?.trim()) {
      return [];
    }

    const actions =
      item.actions?.filter((action): action is AiReviewActionType =>
        VALID_ACTIONS.has(action as AiReviewActionType)
      ) ?? defaultActions(category);

    const suggestedLineItem =
      item.suggestedLineItem?.description ?
        {
          category:
            (item.suggestedLineItem.category as EstimateCategory) ?? "materials",
          description: item.suggestedLineItem.description,
          quantity: item.suggestedLineItem.quantity ?? 1,
          unit:
            item.suggestedLineItem.unit ??
            getDefaultUnitForCategory(
              (item.suggestedLineItem.category as EstimateCategory) ?? "materials"
            ),
          unit_cost: item.suggestedLineItem.unit_cost ?? 0,
        }
      : inferSuggestedLineItem(category, item.title);

    return [
      enrichLegacyRecommendation(
        {
          id: `ai-${category}-${index}`,
          section,
          category,
          severity,
          title: item.title.trim(),
          explanation: item.explanation.trim(),
          reasoning:
            item.reasoning?.trim() ?? defaultReasoning(category),
          businessImpact: item.businessImpact?.trim() ?? "",
          confidence:
            typeof item.confidence === "number" ?
              Math.max(0, Math.min(100, Math.round(item.confidence)))
            : 70,
          recommendedAction:
            item.recommendedAction?.trim() ?? defaultRecommendedAction(category),
          actions: actions.length > 0 ? actions : defaultActions(category),
          suggestedLineItem,
          relatedLineItemId: item.relatedLineItemId,
          suggestedUnitCost: item.suggestedUnitCost,
          suggestedMarkupIncrease:
            item.suggestedMarkupIncrease ??
            (category === "low_margin" ? 3 : undefined),
        },
        analysis
      ),
    ];
  });
}

function mergeRecommendations(
  rules: AiReviewRecommendation[],
  ai: AiReviewRecommendation[]
) {
  const merged = new Map<string, AiReviewRecommendation>();

  for (const item of [...rules, ...ai]) {
    const key = `${item.section}:${item.category}:${item.title.toLowerCase()}`;
    const existing = merged.get(key);

    if (!existing || item.confidence > existing.confidence) {
      merged.set(key, item);
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };

  return Array.from(merged.values()).sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );
}

function finalizeResult(
  recommendations: AiReviewRecommendation[],
  analysis: EstimateReviewAnalysis,
  source: AiReviewSource,
  aiEnabled: boolean,
  aiSummary?: string
): AiReviewResult {
  const enrichedRecommendations = recommendations.map(enrichRecommendationForResponse);
  const health = buildHealth(recommendations, analysis);
  const sections = buildSections(enrichedRecommendations);
  const stats = buildStats(recommendations);

  return {
    recommendations: enrichedRecommendations,
    sections,
    health,
    analysis,
    summary: buildSummary(recommendations, health, analysis, aiSummary),
    reviewedAt: new Date().toISOString(),
    source,
    aiEnabled,
    stats,
  };
}

/**
 * Rule-based + optional OpenAI estimate review.
 * Returns structured JSON — swap the OpenAI path here without UI changes.
 */
export async function runAiReview(
  payload: AiReviewPayload
): Promise<AiReviewResult> {
  const { recommendations: rulesRecommendations, analysis } =
    buildRulesReview(payload);
  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured) {
    return finalizeResult(rulesRecommendations, analysis, "rules", false);
  }

  const client = getOpenAIClient();

  if (!client) {
    return finalizeResult(rulesRecommendations, analysis, "rules", false);
  }

  try {
    const { model } = getOpenAIConfig();
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior commercial electrical estimator. Return structured JSON recommendations only. Analyze the full project context, not isolated line items. Never instruct auto-editing of the estimate.",
        },
        {
          role: "user",
          content: buildOpenAiPrompt(payload, analysis),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonResponse<AiReviewJsonPayload>(content);
    const aiRecommendations = normalizeAiRecommendations(parsed, analysis);
    const recommendations = mergeRecommendations(
      rulesRecommendations,
      aiRecommendations
    );

    return finalizeResult(
      recommendations,
      analysis,
      aiRecommendations.length > 0 ? "hybrid" : "rules",
      true,
      parsed?.summary
    );
  } catch {
    return finalizeResult(rulesRecommendations, analysis, "rules", true);
  }
}

/** Synchronous rules-only path for tests and offline use. */
export function runRulesReview(payload: AiReviewPayload): AiReviewResult {
  const { recommendations, analysis } = buildRulesReview(payload);
  return finalizeResult(recommendations, analysis, "rules", false);
}

export function buildLineItemFromSuggestion(
  suggestion: AiReviewSuggestedLineItem,
  sortOrder: number
): EstimateLineItemInput {
  return {
    id: crypto.randomUUID(),
    category: suggestion.category,
    description: suggestion.description,
    quantity: suggestion.quantity,
    unit: suggestion.unit,
    unit_cost: suggestion.unit_cost,
    sort_order: sortOrder,
  };
}

export function groupRecommendationsBySection(
  recommendations: AiReviewRecommendation[]
): AiReviewSection[] {
  return buildSections(recommendations);
}
