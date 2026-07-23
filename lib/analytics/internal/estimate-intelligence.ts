import { ESTIMATE_CATEGORY_LABELS, type EstimateCategory } from "@/lib/estimates/types";
import { average, safePercent } from "@/lib/analytics/time-buckets";
import type {
  EstimateIntelligenceInput,
  EstimateIntelligenceRecord,
  EstimateLineItemRecord,
} from "@/lib/analytics/types";

export type EstimateIntelligenceSource = "rules" | "openai";

export type RankedEstimateMetric = {
  key: string;
  label: string;
  count: number;
  sharePercent: number;
};

export type EstimateIntelligenceResult = {
  averageCreationHours: number;
  averageEstimateValue: number;
  averageRevisionCount: number;
  averageLaborPercent: number;
  averageMaterialPercent: number;
  mostCommonSections: RankedEstimateMetric[];
  mostFrequentMaterials: RankedEstimateMetric[];
  finalizedEstimateCount: number;
  estimateCount: number;
  generatedAt: string;
  source: EstimateIntelligenceSource;
  methodology: string;
};

const MATERIAL_RANK_LIMIT = 8;
const SECTION_RANK_LIMIT = 5;

function normalizeMaterialDescription(description: string) {
  return description.trim().replace(/\s+/g, " ");
}

function buildAverageCreationHours(estimates: EstimateIntelligenceRecord[]) {
  const finalized = estimates.filter(
    (estimate) => estimate.status === "Final" && estimate.creationHours > 0
  );

  if (finalized.length > 0) {
    return average(finalized.map((estimate) => estimate.creationHours));
  }

  const samples = estimates
    .filter((estimate) => estimate.creationHours > 0)
    .map((estimate) => estimate.creationHours);

  return average(samples);
}

function buildAverageEstimateValue(estimates: EstimateIntelligenceRecord[]) {
  const values = estimates.map((estimate) => estimate.value).filter((value) => value > 0);
  return average(values);
}

function buildAverageRevisionCount(estimates: EstimateIntelligenceRecord[]) {
  if (estimates.length === 0) {
    return 0;
  }

  const totalRevisions = estimates.reduce(
    (sum, estimate) => sum + estimate.revisionCount,
    0
  );

  return totalRevisions / estimates.length;
}

function buildAverageLaborPercent(estimates: EstimateIntelligenceRecord[]) {
  const samples = estimates
    .filter((estimate) => estimate.directCostTotal > 0)
    .map((estimate) =>
      safePercent(estimate.laborTotal, estimate.directCostTotal)
    );

  return average(samples);
}

function buildAverageMaterialPercent(estimates: EstimateIntelligenceRecord[]) {
  const samples = estimates
    .filter((estimate) => estimate.directCostTotal > 0)
    .map((estimate) =>
      safePercent(estimate.materialsTotal, estimate.directCostTotal)
    );

  return average(samples);
}

function buildMostCommonSections(
  lineItems: EstimateLineItemRecord[],
  estimateCount: number
) {
  const sectionCounts = new Map<string, number>();

  for (const item of lineItems) {
    sectionCounts.set(item.category, (sectionCounts.get(item.category) ?? 0) + 1);
  }

  const total = Array.from(sectionCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  return Array.from(sectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, SECTION_RANK_LIMIT)
    .map(([category, count]) => ({
      key: category,
      label:
        ESTIMATE_CATEGORY_LABELS[category as EstimateCategory] ??
        category.replace(/_/g, " "),
      count,
      sharePercent: safePercent(count, total || estimateCount),
    }));
}

function buildMostFrequentMaterials(lineItems: EstimateLineItemRecord[]) {
  const materialCounts = new Map<string, { label: string; count: number }>();

  for (const item of lineItems) {
    if (item.category !== "materials") {
      continue;
    }

    const label = normalizeMaterialDescription(item.description);
    if (!label) {
      continue;
    }

    const key = label.toLowerCase();
    const existing = materialCounts.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    materialCounts.set(key, { label, count: 1 });
  }

  const total = Array.from(materialCounts.values()).reduce(
    (sum, entry) => sum + entry.count,
    0
  );

  return Array.from(materialCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MATERIAL_RANK_LIMIT)
    .map(([key, entry]) => ({
      key,
      label: entry.label,
      count: entry.count,
      sharePercent: safePercent(entry.count, total),
    }));
}

/**
 * Rule-based estimate intelligence from estimate totals, versions, and line items.
 * Swap the implementation to call OpenAI later without changing consumers.
 */
export function generateEstimateIntelligence(
  input: EstimateIntelligenceInput,
  generatedAt: string,
  source: EstimateIntelligenceSource = "rules"
): EstimateIntelligenceResult {
  const finalizedEstimateCount = input.estimates.filter(
    (estimate) => estimate.status === "Final"
  ).length;

  return {
    averageCreationHours: buildAverageCreationHours(input.estimates),
    averageEstimateValue: buildAverageEstimateValue(input.estimates),
    averageRevisionCount: buildAverageRevisionCount(input.estimates),
    averageLaborPercent: buildAverageLaborPercent(input.estimates),
    averageMaterialPercent: buildAverageMaterialPercent(input.estimates),
    mostCommonSections: buildMostCommonSections(
      input.lineItems,
      input.estimates.length
    ),
    mostFrequentMaterials: buildMostFrequentMaterials(input.lineItems),
    finalizedEstimateCount,
    estimateCount: input.estimates.length,
    generatedAt,
    source,
    methodology:
      "Derived from estimate timestamps, version history, direct cost totals, and line-item categories/materials.",
  };
}

/** Future OpenAI upgrade path — same signature, different implementation. */
export async function generateEstimateIntelligenceAsync(
  input: EstimateIntelligenceInput,
  generatedAt: string
): Promise<EstimateIntelligenceResult> {
  return generateEstimateIntelligence(input, generatedAt, "rules");
}

export function formatEstimateCreationTime(hours: number) {
  if (hours <= 0) {
    return "—";
  }

  if (hours < 48) {
    return `${hours.toFixed(1)} hrs`;
  }

  return `${(hours / 24).toFixed(1)} days`;
}
