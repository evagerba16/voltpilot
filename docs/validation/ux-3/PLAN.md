# UX-3 Plan — Estimates (Product Standard v1)

**Status:** Planning complete → **implemented** (2026-07-23)  
**Prerequisite:** Product Standard v1 frozen ✅  
**Scope:** UX polish only — no new features, no DB/API changes  
**Standard:** `docs/PRODUCT_STANDARD_V1.md` · `docs/DESIGN_SYSTEM_V1.md`

---

## Primary question

| Page | Question |
|------|----------|
| `/estimates` | *Which estimates need work?* |
| `/estimates/[id]` | *Build and finalize this bid.* |

Add to `lib/ui/entity-page-copy.ts` when implementing.

---

## Problem statement (from code audit)

The estimate builder is the **highest-frequency daily screen** but does not yet follow Product Standard v1:

| Issue | Current state | Product Standard target |
|-------|---------------|-------------------------|
| No light hero | Back link + inline metadata card | Light card hero with primary question + one CTA |
| Toolbar overload | 10+ equal-weight buttons (AI, templates, proposal, finalize, duplicate, delete, save…) | One primary CTA; secondary in `···` menu or ghost links |
| Sticky summary bar | 9 metric columns above fold | Selling price prominent; category totals in sticky sidebar or collapsed |
| Multiple AI entry points | Copilot + AI Review + Assistant + inline review card | One AI entry (context-aware); compact insights max 3 |
| Assemblies library | Always visible panel | Drawer or tab — progressive disclosure |
| Page rhythm | `space-y-6`, dense sections | `space-y-10`, calmer hierarchy |
| List page intro | Feature-oriented copy | Task-focused `PageIntro` (match Customers/Projects) |

**Out of scope for UX-3:** New estimate capabilities, Copilot behavior changes, calculation logic, proposal editor (UX-3b).

---

## Page 1: Estimates list (`/estimates`)

**Page type:** List (DS v1 §2)

### Target layout

```
[PageIntro — task-focused one-liner]
[Optional: compact 3-KPI snapshot — drafts / in progress / pipeline value]
[ListPageHeader — "Estimate directory" + filter for status/project]
[FilterBar + EstimatesTable]
```

### Files

| File | Change |
|------|--------|
| `app/(dashboard)/estimates/page.tsx` | Task-focused `PageIntro`; optional compact stats |
| `components/estimates/estimates-view.tsx` | Align header copy with list page pattern |
| New (optional): `components/estimates/estimates-stats-compact.tsx` | 3 KPIs mirroring `projects-stats.tsx` compact mode |

### Success criteria

- [ ] Primary question obvious in 5 seconds
- [ ] No more than 3 KPI-style cards if stats added
- [ ] Single primary action in header (if applicable)
- [ ] Matches Customers/Projects list density

---

## Page 2: Estimate builder (`/estimates/[id]`)

**Page type:** Workspace (extends Entity detail patterns — hero + focused work area)

The builder is a **workspace page**: hero for context + primary action, then line items as the main canvas. Tabs optional for secondary panels.

### Target layout

```
[← Back to estimates]

[Light card hero]
  Eyebrow: Estimate · Status badge
  H1: Estimate title (or project name)
  Primary question: "Build and finalize this bid."
  Context: Customer · Project links · address
  ONE primary CTA: context-aware
    - Draft → "Review with AI" or "Finalize estimate"
    - Final → "Add proposal"
  Context line under CTA
  Ghost: Edit title/notes · ··· more (templates, history, duplicate, delete)

[Attention strip — max 3 — only if AI/copilot flags urgent items]

[Workspace — two column]
  LEFT (primary): Line items by category — increased section spacing
  RIGHT (sticky): Estimate summary — selling price, margin, markups

[Progressive disclosure — not above fold]
  - Assemblies library → drawer (slide-over) triggered from toolbar
  - AI Review / Copilot / Assistant → single panel or modal (one entry point)
  - Version history → modal (existing)
  - Keyboard shortcuts → modal (existing)
```

### Primary CTA logic (context-aware)

| State | Primary CTA | Secondary (ghost / menu) |
|-------|-------------|--------------------------|
| Draft, unsaved changes | Save (or autosave indicator only; primary = Continue work) | Finalize, Add proposal |
| Draft, ready to review | Review with AI | Finalize |
| Draft, reviewed | Finalize estimate | Add proposal |
| Final | Add proposal | Reopen, Duplicate |

Mirror `lib/dashboard/primary-action.ts` pattern — extract `resolveEstimatePrimaryAction()`.

### Toolbar consolidation

**Keep visible:** Save status · Primary CTA · `···` overflow menu

**Move to overflow (`···`):** Templates · Version history · Keyboard shortcuts · Duplicate · Delete · Reopen/Finalize (if not primary)

**AI consolidation:** One button opens the active AI surface (Copilot if enabled, else AI Review). Assistant merges into same panel or overflow.

### Sticky summary simplification

Current sticky bar shows 9 columns. Target:

- **Sticky header:** Final selling price (large) + gross margin %
- **Sidebar `EstimateSummary`:** Category breakdown, markups, tax — existing component, ensure sticky on desktop

Remove duplicate totals from sticky top bar.

### Files

| File | Change |
|------|--------|
| `components/estimates/estimate-builder.tsx` | Hero refactor, toolbar consolidation, sticky bar simplification, assemblies → drawer |
| `lib/estimates/primary-action.ts` | New — context-aware CTA resolver |
| `lib/ui/entity-page-copy.ts` | Add `estimate` primary question |
| `components/estimates/ai-estimate-review-card.tsx` | Collapse inline card; show in panel/modal only |
| `components/estimates/assemblies-library-panel.tsx` | Wrap in drawer trigger |
| `app/(dashboard)/estimates/[id]/page.tsx` | Use `PageMain` + `space-y-10` wrapper for consistency |

### Reuse from Product Standard v1

| Component | Use |
|-----------|-----|
| Hero pattern | From `customer-detail.tsx` / `project-detail.tsx` light card |
| `EntityAttentionStrip` | AI/copilot urgent flags (max 3) |
| `buttonVariants({ className: "rounded-full" })` | Primary CTA |
| Compact AI pattern | From `project-ai-insights-compact.tsx` — adapt for estimate review results |

---

## Implementation phases

### UX-3a: Estimates list (1 day)

1. Update `PageIntro` copy
2. Optional compact stats (3 KPIs)
3. Verify list header matches DS v1

### UX-3b: Estimate builder hero + CTA (1–2 days)

1. Add `resolveEstimatePrimaryAction()`
2. Light card hero with primary question
3. Consolidate toolbar → primary CTA + overflow menu
4. Wire project/customer links in hero

### UX-3c: Builder density + disclosure (1–2 days)

1. Simplify sticky summary bar
2. Assemblies library → drawer
3. Consolidate AI entry points
4. Remove inline `AiEstimateReviewCard` from default view
5. Increase line-item section spacing

**Total estimate:** 3–4 dev-days

---

## Validation

| Check | Command / action |
|-------|------------------|
| Build | `npm run build` |
| Estimates backend | `npm run estimates:verify` |
| Manual QA | Draft → add lines → AI review → finalize → add proposal |
| Five-second test | Can estimator answer "what do I do next?" without scanning 10 buttons |
| Regression | Autosave, keyboard shortcuts, bulk actions, copilot flag paths |

Create `docs/validation/ux-3/REPORT.md` on completion.

---

## Explicitly out of scope

- Proposal editor (`/proposals/[id]`) — **UX-3b follow-on** or separate sub-phase
- New AI capabilities or Copilot orchestrator changes
- Database, API, or workflow changes
- Changes to frozen Product Standard v1 pages (Dashboard, Customers, Projects)
- Analytics, Notifications, Scheduling, Inventory

---

## Feature Approval Gate

| Gate | Answer |
|------|--------|
| User value | Estimators use builder daily; reducing toolbar overload saves time |
| Frequency | Daily |
| Simplicity | Extend existing components; layout/disclosure only |
| Product alignment | Applies frozen Product Standard v1 to highest-traffic remaining screen |
| Engineering impact | Medium — large file refactor; risk: mobile toolbar, autosave regression |
| Success criteria | One Breath clarity; one primary CTA; build + estimates verify pass |

---

## Approval to implement

- [ ] UX-3 plan reviewed
- [ ] Implementation begins with **UX-3a (list)** then **UX-3b/3c (builder)**

*Planning complete. Await explicit approval to begin implementation.*
