import { resolveCatalogLineItem } from "../lib/copilot/catalog-resolver";
import { adaptReviewResultToCopilotRecommendations } from "../lib/copilot/adapters/estimate-review-adapter";
import { runRulesReview } from "../lib/ai/ai-review-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const emt = resolveCatalogLineItem({
  category: "materials",
  description: "1-inch EMT conduit",
  quantity: 150,
  unit: "lf",
});

assert(
  emt.description.toLowerCase().includes("emt"),
  "EMT description should resolve to an EMT catalog item"
);
assert(emt.match.confidence >= 0.65, "EMT match confidence should be >= 0.65");
assert(emt.quantity === 150, "EMT quantity should be preserved");

const bucketTruck = resolveCatalogLineItem({
  category: "equipment",
  description: "Bucket Truck",
  quantity: 1,
  unit: "day",
});

assert(
  bucketTruck.description === "Bucket Truck",
  "Bucket Truck should exact-match equipment catalog"
);
assert(
  bucketTruck.unit_cost > 0,
  "Bucket Truck should include default rental rate from catalog"
);

const review = runRulesReview({
  state: {
    title: "Service upgrade",
    notes: "",
    overhead_percent: 10,
    contingency_percent: 5,
    tax_percent: 0,
    profit_margin_percent: 8,
    line_items: [
      {
        category: "labor",
        description: "Service upgrade labor",
        quantity: 8,
        unit: "hrs",
        unit_cost: 85,
        sort_order: 0,
      },
    ],
  },
  context: {
    projectName: "Main Street Service",
    customerName: "ACME Electric",
    projectType: "Commercial",
    projectAddress: null,
  },
});

const copilotRecs = adaptReviewResultToCopilotRecommendations(
  review,
  "00000000-0000-4000-8000-000000000001"
);

assert(copilotRecs.length > 0, "Review adapter should produce copilot recommendations");
assert(
  copilotRecs.every((rec) => rec.explanation && rec.title),
  "Each copilot recommendation needs title and explanation"
);

console.log("PASS  catalog resolver (EMT + Bucket Truck)");
console.log("PASS  review adapter → copilot recommendations");
console.log(`INFO  sample recommendation: ${copilotRecs[0]?.title}`);
