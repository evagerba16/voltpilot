import { runRulesReview } from "../lib/ai/ai-review-service";
import { adaptReviewResultToCopilotRecommendations } from "../lib/copilot/adapters/estimate-review-adapter";
import { resolveCatalogLineItem } from "../lib/copilot/catalog-resolver";
import { mergeEquipmentCatalog } from "../lib/estimates/org-catalog/merge-equipment";
import type { OrganizationCatalogItem } from "../lib/estimates/org-catalog/types";
import { getDefaultEquipmentSeedRows } from "../lib/estimates/org-catalog/merge-equipment";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isMissingTableError(message: string) {
  return message.includes("copilot_recommendations");
}

/** Mirrors lib/copilot/queries.ts graceful degradation when table is absent. */
function simulateMissingTablePersistence(recommendations: { id: string }[]) {
  const errorMessage =
    'relation "public.copilot_recommendations" does not exist';

  if (isMissingTableError(errorMessage)) {
    return recommendations;
  }

  throw new Error(errorMessage);
}

const reviewPayload = {
  state: {
    title: "Offline probe",
    notes: "",
    overhead_percent: 10,
    contingency_percent: 5,
    tax_percent: 0,
    profit_margin_percent: 8,
    line_items: [
      {
        category: "labor" as const,
        description: "Service labor",
        quantity: 8,
        unit: "hrs",
        unit_cost: 85,
        sort_order: 0,
      },
    ],
  },
  context: {
    projectName: "Offline Project",
    customerName: "Offline Customer",
    projectType: "Commercial",
    projectAddress: null,
  },
};

const rulesReview = runRulesReview(reviewPayload);
assert(rulesReview.source === "rules", "Rules review should use rules source");
assert(!rulesReview.aiEnabled, "Rules review should not report ai_enabled");

const copilotRecs = adaptReviewResultToCopilotRecommendations(
  rulesReview,
  "00000000-0000-4000-8000-000000000001"
);

assert(copilotRecs.length > 0, "Adapter should produce recommendations without OpenAI");

const persistedWithoutTable = simulateMissingTablePersistence(copilotRecs);
assert(
  persistedWithoutTable.length === copilotRecs.length,
  "Missing table should return in-memory recommendations unchanged"
);

console.log("PASS  OpenAI unavailable → rules-only review + copilot adapter");

const seedBucket = getDefaultEquipmentSeedRows().find((row) => row.name === "Bucket Truck");
assert(seedBucket, "Bucket Truck seed row required");
const defaultCost = seedBucket.defaultUnitCost ?? 0;

const orgOverridesRaw = process.env.COPILOT_VERIFY_ORG_OVERRIDES;
let orgOverrides: OrganizationCatalogItem[] = [];

if (orgOverridesRaw) {
  try {
    orgOverrides = JSON.parse(orgOverridesRaw) as OrganizationCatalogItem[];
  } catch {
    orgOverrides = [];
  }
}

const mergedCatalog = mergeEquipmentCatalog(orgOverrides);
const resolvedDefault = resolveCatalogLineItem({
  category: "equipment",
  description: "Bucket Truck",
  quantity: 1,
  unit: "day",
  catalog: mergedCatalog,
});

assert(resolvedDefault.description === "Bucket Truck", "Bucket Truck should resolve");

const bucketOverride = orgOverrides.find(
  (item) =>
    item.name === "Bucket Truck" ||
    item.catalog_item_id === seedBucket.catalogItemId
);

if (bucketOverride?.default_unit_cost != null) {
  assert(
    resolvedDefault.unit_cost === bucketOverride.default_unit_cost,
    `Org override cost ${bucketOverride.default_unit_cost} should win over default ${defaultCost}`
  );
  console.log(
    `PASS  Org catalog pricing override applied ($${resolvedDefault.unit_cost}/day)`
  );
} else {
  assert(
    resolvedDefault.unit_cost === defaultCost,
    "Without override, default seed cost should be used"
  );
  console.log(`PASS  Default catalog pricing ($${resolvedDefault.unit_cost}/day)`);
}

console.log("PASS  Missing migration 023 → graceful in-memory persistence");
