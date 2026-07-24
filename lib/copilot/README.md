# VoltPilot Copilot — Phase 1

Shared AI foundation for embedded copilot features across VoltPilot. Phase 1 adds the core layer without changing existing estimate AI UI.

## Goals

- Unified recommendation schema (`CopilotRecommendation`)
- Catalog resolver (free-text → catalog item + unit + cost)
- Copilot orchestrator wrapping existing estimate review
- Persisted recommendations (`copilot_recommendations`)
- REST API: analyze, apply, dismiss

**Existing routes unchanged:** `/api/ai/estimate-assistant`, `/api/ai/estimate-review`, and all current estimate builder AI UI continue to work as-is.

## Layout

```
lib/copilot/
  types.ts                 # Shared schema
  catalog-resolver.ts      # Catalog matching (pure functions)
  orchestrator.ts          # runCopilotAnalysis / Apply / Dismiss
  queries.ts               # Supabase persistence
  api.ts                   # Request parsing
  context/estimate.ts      # Estimate context builder
  adapters/
    estimate-review-adapter.ts  # AiReviewResult → CopilotRecommendation
  apply/estimate.ts        # Apply recommendations to builder state
  index.ts                 # Public exports

app/api/copilot/
  analyze/route.ts         # POST — run analysis
  apply/route.ts           # POST — apply selected recommendations
  dismiss/route.ts         # POST — dismiss recommendations
```

## Database

Apply migration `023_copilot_recommendations.sql` (or SQL Editor copy):

```bash
npm run db:migrate
# or run supabase/sql-editor/023_copilot_recommendations.sql
```

Table: `copilot_recommendations` with org-scoped RLS (`can_view_org_data` / `can_edit_estimates`).

If the table is missing, analyze still returns results but skips persistence (graceful degradation).

## API

### POST `/api/copilot/analyze`

**Auth:** `ai.view`  
**Rate limit:** 20/min per user/IP

```json
{
  "module": "estimate",
  "mode": "review",
  "entity_id": "<estimate-uuid>",
  "state": { "...EstimateBuilderState" },
  "context": {
    "projectName": "Project",
    "customerName": "Customer",
    "projectType": "Commercial",
    "projectAddress": null
  },
  "previous_recommendation_refs": []
}
```

**Response:** `CopilotAnalyzeResult` with:

- `meta` — source, ai_enabled, summary
- `recommendations` — unified schema with catalog-enriched line items
- `health` — estimate health score
- `legacy.review_result` — original `AiReviewResult` for backward compatibility

### POST `/api/copilot/apply`

**Auth:** `estimates.edit`

```json
{
  "module": "estimate",
  "entity_type": "estimate",
  "entity_id": "<estimate-uuid>",
  "recommendation_ids": ["<uuid>", "..."]
}
```

Applies selected recommendations, saves an `"AI generated"` estimate version, marks rows as `applied`.

### POST `/api/copilot/dismiss`

**Auth:** `estimates.edit`

Same body shape as apply; marks recommendations `dismissed`.

## Catalog resolver

```typescript
import { resolveCatalogLineItem } from "@/lib/copilot";

const result = resolveCatalogLineItem({
  category: "materials",
  description: "1-inch EMT conduit",
  quantity: 150,
});
// → matched name, unit, unit_cost, confidence, explanation
```

Resolution order:

1. Exact catalog name match
2. Fuzzy search (keywords, group labels)
3. Company library (client-side catalog layer)
4. Unresolved — preserves input, flags for manual review

Pass a merged org equipment catalog via `catalog` option for org-specific pricing.

## Verification

```bash
npm run copilot:verify   # catalog resolver + adapter smoke tests
npm run build            # typecheck + compile
```

## Phase 2 (not started)

- Embedded `CopilotPanel` in estimate builder
- NL estimating with selective apply
- Deprecate duplicate AI entry points in UI

Do not wire the new API into existing UI until Phase 2.
