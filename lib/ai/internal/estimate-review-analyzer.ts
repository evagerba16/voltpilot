import { calculateEstimateTotals } from "@/lib/estimates/calculations";
import type { EstimateReviewContext } from "@/lib/ai/types";
import type {
  EstimateBuilderState,
  EstimateCategory,
  EstimateLineItemInput,
} from "@/lib/estimates/types";

export type ProjectTypeProfile =
  | "commercial_ti"
  | "new_construction"
  | "industrial"
  | "healthcare"
  | "education"
  | "retail"
  | "multifamily"
  | "service_call"
  | "general_commercial";

export type EstimateComplexityLevel = "low" | "medium" | "high";

export type EstimateScopeSignals = {
  hasPanelWork: boolean;
  hasSwitchgear: boolean;
  hasFireAlarm: boolean;
  hasDataLowVoltage: boolean;
  hasLighting: boolean;
  hasControls: boolean;
  hasGenerator: boolean;
  hasDemo: boolean;
  hasUnderground: boolean;
  hasTempPower: boolean;
  hasPermitLanguage: boolean;
  hasTestingLanguage: boolean;
  hasCleanupLanguage: boolean;
  hasConduitWork: boolean;
  hasWirePull: boolean;
};

export type EstimateReviewAnalysis = {
  context: EstimateReviewContext;
  projectType: ProjectTypeProfile;
  projectTypeLabel: string;
  customerName: string;
  projectName: string;
  totals: ReturnType<typeof calculateEstimateTotals>;
  categoryTotals: Record<EstimateCategory, number>;
  laborHours: number;
  laborToMaterialRatio: number | null;
  materialShareOfDirectCost: number;
  laborShareOfDirectCost: number;
  sellPricePerLaborHour: number | null;
  grossMarginPercent: number;
  profitMarginSetting: number;
  overheadPercent: number;
  contingencyPercent: number;
  lineItemCount: number;
  activeLineItemCount: number;
  laborLineCount: number;
  materialLineCount: number;
  notesPresent: boolean;
  scopeText: string;
  scopeSignals: EstimateScopeSignals;
  complexity: {
    score: number;
    level: EstimateComplexityLevel;
    factors: string[];
  };
};

function activeLineItems(items: EstimateLineItemInput[]) {
  return items.filter(
    (item) =>
      item.description.trim() || item.quantity > 0 || item.unit_cost > 0
  );
}

function sumCategory(
  items: EstimateLineItemInput[],
  category: EstimateCategory
) {
  return items
    .filter((item) => item.category === category)
    .reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
}

function sumLaborHours(items: EstimateLineItemInput[]) {
  return items
    .filter((item) => item.category === "labor")
    .reduce((sum, item) => sum + item.quantity, 0);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function inferProjectTypeProfile(
  context: EstimateReviewContext,
  scopeText: string
): { profile: ProjectTypeProfile; label: string } {
  const haystack = [
    context.projectType ?? "",
    context.projectName,
    context.projectAddress ?? "",
    scopeText,
  ]
    .join(" ")
    .toLowerCase();

  if (includesAny(haystack, ["new construction", "ground-up", "new build"])) {
    return { profile: "new_construction", label: "New construction" };
  }

  if (includesAny(haystack, ["tenant", "ti ", "build-out", "buildout", "fit-out"])) {
    return { profile: "commercial_ti", label: "Commercial tenant improvement" };
  }

  if (includesAny(haystack, ["hospital", "healthcare", "medical", "clinic"])) {
    return { profile: "healthcare", label: "Healthcare" };
  }

  if (includesAny(haystack, ["school", "university", "education", "campus"])) {
    return { profile: "education", label: "Education" };
  }

  if (includesAny(haystack, ["retail", "store", "restaurant", "tenant finish"])) {
    return { profile: "retail", label: "Retail / restaurant" };
  }

  if (includesAny(haystack, ["industrial", "warehouse", "manufacturing", "plant"])) {
    return { profile: "industrial", label: "Industrial" };
  }

  if (includesAny(haystack, ["apartment", "multifamily", "condo", "residential"])) {
    return { profile: "multifamily", label: "Multifamily / residential" };
  }

  if (includesAny(haystack, ["service", "troubleshoot", "repair", "callback"])) {
    return { profile: "service_call", label: "Service / repair" };
  }

  return {
    profile: "general_commercial",
    label: context.projectType ?? "Commercial electrical",
  };
}

function buildScopeSignals(scopeText: string): EstimateScopeSignals {
  return {
    hasPanelWork: includesAny(scopeText, ["panel", "switchboard", "switchgear"]),
    hasSwitchgear: includesAny(scopeText, ["switchgear", "transformer", "mv "]),
    hasFireAlarm: includesAny(scopeText, ["fire alarm", "facp", "smoke", "notification"]),
    hasDataLowVoltage: includesAny(scopeText, [
      "data",
      "low voltage",
      "low-voltage",
      "security",
      "access control",
    ]),
    hasLighting: includesAny(scopeText, ["light", "fixture", "lumen", "led"]),
    hasControls: includesAny(scopeText, ["control", "dimming", "0-10", " BACnet", "lighting control"]),
    hasGenerator: includesAny(scopeText, ["generator", "ats", "transfer switch", "emergency"]),
    hasDemo: includesAny(scopeText, ["demo", "demolition", "remove existing"]),
    hasUnderground: includesAny(scopeText, ["underground", "ug ", " trench", "duct bank"]),
    hasTempPower: includesAny(scopeText, ["temp power", "temporary power", "temp service"]),
    hasPermitLanguage: includesAny(scopeText, ["permit", "inspect", "inspection"]),
    hasTestingLanguage: includesAny(scopeText, [
      "test",
      "commission",
      "startup",
      "ir scan",
      "megger",
    ]),
    hasCleanupLanguage: includesAny(scopeText, [
      "cleanup",
      "clean up",
      "disposal",
      "debris",
      "dumpster",
    ]),
    hasConduitWork: includesAny(scopeText, ["conduit", "emt", "rigid", "pvc"]),
    hasWirePull: includesAny(scopeText, ["wire", "pull", "conductor", "cable"]),
  };
}

function buildComplexity(
  analysis: Pick<
    EstimateReviewAnalysis,
    | "activeLineItemCount"
    | "totals"
    | "scopeSignals"
    | "laborLineCount"
    | "projectType"
  >
): EstimateReviewAnalysis["complexity"] {
  const factors: string[] = [];
  let score = 20;

  if (analysis.totals.finalSellingPrice > 100000) {
    score += 25;
    factors.push("High-value bid");
  } else if (analysis.totals.finalSellingPrice > 25000) {
    score += 12;
    factors.push("Mid-size commercial bid");
  }

  if (analysis.activeLineItemCount >= 12) {
    score += 10;
    factors.push("Detailed line-item breakdown");
  } else if (analysis.activeLineItemCount <= 4 && analysis.totals.directCost > 10000) {
    score += 18;
    factors.push("Rolled-up scope on a meaningful bid");
  }

  if (analysis.scopeSignals.hasSwitchgear) {
    score += 15;
    factors.push("Distribution / switchgear scope");
  }

  if (analysis.scopeSignals.hasFireAlarm) {
    score += 10;
    factors.push("Fire alarm scope");
  }

  if (analysis.scopeSignals.hasGenerator) {
    score += 10;
    factors.push("Emergency / generator scope");
  }

  if (analysis.laborLineCount === 1 && analysis.totals.directCost > 15000) {
    score += 8;
    factors.push("Single labor line on multi-scope bid");
  }

  if (analysis.projectType === "new_construction") {
    score += 8;
    factors.push("New construction coordination risk");
  }

  score = Math.max(0, Math.min(100, score));

  const level: EstimateComplexityLevel =
    score >= 70 ? "high"
    : score >= 40 ? "medium"
    : "low";

  return { score, level, factors };
}

export function analyzeEstimateReviewContext(
  state: EstimateBuilderState,
  context: EstimateReviewContext
): EstimateReviewAnalysis {
  const items = activeLineItems(state.line_items);
  const scopeText = items.map((item) => item.description.toLowerCase()).join(" ");
  const notesText = state.notes.toLowerCase();
  const fullScopeText = `${scopeText} ${notesText}`;

  const totals = calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    state.profit_margin_percent,
    state.tax_percent
  );

  const categoryTotals = {
    labor: sumCategory(state.line_items, "labor"),
    materials: sumCategory(state.line_items, "materials"),
    equipment: sumCategory(state.line_items, "equipment"),
    subcontractors: sumCategory(state.line_items, "subcontractors"),
    miscellaneous: sumCategory(state.line_items, "miscellaneous"),
  };

  const laborHours = sumLaborHours(state.line_items);
  const laborToMaterialRatio =
    categoryTotals.materials > 0 ?
      categoryTotals.labor / categoryTotals.materials
    : null;

  const { profile, label } = inferProjectTypeProfile(context, fullScopeText);
  const scopeSignals = buildScopeSignals(fullScopeText);

  const analysisBase = {
    context,
    projectType: profile,
    projectTypeLabel: label,
    customerName: context.customerName,
    projectName: context.projectName,
    totals,
    categoryTotals,
    laborHours,
    laborToMaterialRatio,
    materialShareOfDirectCost:
      totals.directCost > 0 ? categoryTotals.materials / totals.directCost : 0,
    laborShareOfDirectCost:
      totals.directCost > 0 ? categoryTotals.labor / totals.directCost : 0,
    sellPricePerLaborHour:
      laborHours > 0 ? totals.finalSellingPrice / laborHours : null,
    grossMarginPercent: totals.grossMarginPercent,
    profitMarginSetting: state.profit_margin_percent,
    overheadPercent: state.overhead_percent,
    contingencyPercent: state.contingency_percent,
    lineItemCount: state.line_items.length,
    activeLineItemCount: items.length,
    laborLineCount: items.filter((item) => item.category === "labor").length,
    materialLineCount: items.filter((item) => item.category === "materials").length,
    notesPresent: Boolean(state.notes.trim()),
    scopeText: fullScopeText,
    scopeSignals,
    complexity: {
      score: 0,
      level: "low" as EstimateComplexityLevel,
      factors: [] as string[],
    },
  };

  return {
    ...analysisBase,
    complexity: buildComplexity(analysisBase),
  };
}

export function serializeAnalysisForPrompt(analysis: EstimateReviewAnalysis) {
  return JSON.stringify(
    {
      customer: analysis.customerName,
      project: analysis.projectName,
      projectType: analysis.projectTypeLabel,
      sellPrice: analysis.totals.finalSellingPrice,
      directCost: analysis.totals.directCost,
      grossMarginPercent: analysis.grossMarginPercent,
      laborToMaterialRatio: analysis.laborToMaterialRatio,
      laborHours: analysis.laborHours,
      complexity: analysis.complexity,
      scopeSignals: analysis.scopeSignals,
      categoryTotals: analysis.categoryTotals,
      notesPresent: analysis.notesPresent,
    },
    null,
    2
  );
}
