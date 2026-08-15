# UX-3 Report — Estimates (Product Standard v1)

**Status:** Complete — **approved** (2026-07-23)  
**Scope:** `/estimates`, `/estimates/[id]` — layout and disclosure only (no new features)

---

## Objective

Propagate Product Standard v1 to Estimates. Treat the builder as a **workspace** for uninterrupted bid creation—not an information page.

---

## Changes

### Estimates list (`/estimates`)

- Task-focused `PageIntro` and list header copy aligned with Customers/Projects

### Estimate builder (`/estimates/[id]`)

| Pattern | Implementation |
|---------|----------------|
| Context header | `EstimateWorkspaceHeader` — light card, status, inline title, primary question, project/customer links |
| One primary CTA | `resolveEstimatePrimaryAction()` — Review with AI / Copilot / Add proposal by state |
| Progressive disclosure | Notes in collapsible `<details>`; assemblies in modal drawer; overflow menu for secondary actions |
| Compact AI | `EstimateAiInsightsCompact` — max 3 quick checks; hidden when none; full review in panel |
| Lower density | Removed 9-column sticky metrics bar; bid price + margin context strip only |
| Workspace focus | Main column is line items only; summary sticky sidebar unchanged |

### Toolbar consolidation

**Visible:** Assemblies · Save status · Primary CTA · Overflow (`···`)

**Overflow menu:** Save · Templates · History · Assistant · Shortcuts · Proposal · Finalize/Reopen · Duplicate · Delete

### New files

- `lib/estimates/primary-action.ts`
- `components/estimates/estimate-workspace-header.tsx`
- `components/estimates/estimate-ai-insights-compact.tsx`
- `components/estimates/estimate-builder-overflow-menu.tsx`

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Autosave / keyboard shortcuts | Preserved |
| Copilot flag path | Preserved |
| AI Review panel | Preserved (modal) |

---

## Not changed

- Line item editing, calculations, autosave logic
- Copilot orchestrator
- Frozen Product Standard v1 pages (Dashboard, Customers, Projects)
- Proposals editor (UX-3b follow-on)

---

## Manual QA

1. Open draft estimate — workspace shows line items without assemblies/AI card blocking view
2. Primary CTA runs AI review or opens Copilot based on flag
3. Assemblies opens modal, inserts, closes
4. Overflow menu reaches finalize, proposal, duplicate, delete
5. Final estimate — primary CTA is Add proposal
6. Notes expandable without leaving workspace

---

*Proposals propagation deferred to next phase.*
