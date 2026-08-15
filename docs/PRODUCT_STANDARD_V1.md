# VoltPilot Product Standard v1

**Status:** COMPLETE — governance closed (no new principles unless a real customer problem requires it)  
**Frozen:** 2026-07-23  
**UX-3 approved:** 2026-07-23 (Estimates propagated)  
**Governance locked:** 2026-07-23 — changes require product decision  
**Validation:** `docs/validation/product-validation/SUMMARY.md` — PASS  
**Companion:** `docs/DESIGN_SYSTEM_V1.md`

---

## Established design language

Product Standard v1 is **propagated and validated** across:

| Module | Routes | Status |
|--------|--------|--------|
| Dashboard | `/dashboard` | ✅ Reference |
| Customers | `/customers`, `/customers/[id]` | ✅ Reference |
| Projects | `/projects`, `/projects/[id]` | ✅ Reference |
| Estimates | `/estimates`, `/estimates/[id]` | ✅ Reference (UX-3) |

**Remaining work:** Finish the contractor workflow — Proposals and Analytics apply Product Standard v1; verify seamless handoffs. See `docs/validation/contractor-workflow/PHASE.md`.

---

## Governance (complete — closed)

**Product Standard v1 is complete.** No additional governance principles should be added unless a **real customer problem** demonstrates that the current standard is insufficient. Do not spend more time refining rules than improving the product.

**North star:** Successful **beta with real electrical contractors**.

**The Golden Question** (every new feature must answer):

> *How does this help the contractor finish today's work?*

Not: Is it technically impressive? A cool AI feature? Does it look nice?

But: **Does it help someone get home earlier because paperwork got done faster?** That is VoltPilot's mission.

**Feature gate** (also ask): Does this help work happen **faster**, **more accurately**, or with **less stress**?

| Priority | Work |
|----------|------|
| 1 | Finish contractor workflow (Proposals, job costing handoff, analytics handoff) |
| 2 | Sprint 2A validation (when test account available) |
| 3 | Production readiness (billing, email, error handling, onboarding) |
| 4 | Beta with real electrical contractors |
| Later | Notifications, Scheduling, Inventory, future AI — **only from beta feedback** |

Governance doc changes require **product decision**. Building features that pass the Golden Question does not.

## Protection policy

| Rule | Detail |
|------|--------|
| **No new interaction patterns** | Reuse existing page types, components, and limits — do not invent alternatives |
| **Propagation only** | Future UX work applies this standard to remaining modules |
| **Consistency over preference** | Match reference implementations; do not redesign propagated modules for taste |
| **Deviation requires justification** | Any break from Product Standard v1 must be documented with a **unique workflow requirement** — not designer or engineer preference |
| **Frozen routes** | Do not redesign reference pages except regressions or Critical/High production friction |
| **Product Stability Rule** | Validated standards stay stable — change only for customer feedback, measured usability problems, or new business requirements; not redesign appetite |
| **Workflow Momentum Rule** | After the primary task, present the next logical workflow action — no dead ends, no menu detours; optimize flow across modules |

### Product Stability Rule

Once a standard has been validated and adopted, it should **remain stable**. Changes should be driven by:

- Real customer feedback  
- Measured usability problems  
- New business requirements  

—not by a desire to redesign or continuously refine what already works.

### Workflow Momentum Rule

Every propagated module must **preserve workflow momentum**.

When a contractor completes the primary task on a page, the interface must clearly present the **next logical action** in the contractor workflow:

```
Dashboard → Customer → Project → Estimate → Proposal → Awarded → Job Costing → Analytics
```

| Require | Avoid |
|---------|--------|
| Primary CTA leads to the next workflow step when possible | Dead ends after completing a task |
| Context line explains why the next action matters | Forcing a return to menus or sidebar to continue |
| Success states suggest the natural next move | Redundant navigation that repeats the same path |
| Cross-module handoffs (links, redirects, status changes) | Optimizing single pages in isolation |

Optimize for **flow across modules**, not just consistency within individual pages.

**Every primary CTA** should either **advance the contractor forward** or **clearly explain why they cannot move forward yet**. The software must never leave the user wondering what comes next.

| State | Primary CTA or message |
|-------|------------------------|
| Estimate complete | Create proposal |
| Proposal sent | Waiting for customer response |
| Proposal accepted | Convert to active project |
| Project complete | Review job performance |
| Missing required information | Complete required fields |

Implementation: context-aware primary actions (`lib/dashboard/primary-action.ts`, `lib/estimates/primary-action.ts`, entity hero CTAs) resolve to the **next workflow step** or an explicit blocker — not a generic list page.

### Allowed page types (do not add new types without approval)

1. **Dashboard** — daily home, max 3 KPIs, compact AI, activity feeds  
2. **List** — directory + filter + table, task-focused intro  
3. **Entity detail** — context header, attention strip, tabs, `?tab=` persistence  
4. **Workspace** — context header + toolbar + primary canvas (Estimates builder); progressive disclosure via modal/overflow  

### Deviation protocol

Before deviating from any Product Standard v1 pattern:

1. State the **unique workflow requirement** (what the standard cannot support)  
2. Identify the **closest existing pattern** and why it fails  
3. Get **explicit product approval** before implementation  
4. Document in the phase report — do not silently diverge  

Preference, aesthetics, or “this page feels different” are **not** valid justifications.

---

## Reference implementations

| Route | Role | File |
|-------|------|------|
| `/dashboard` | Daily contractor home | `components/dashboard/dashboard-home.tsx` |
| `/customers` | Customer directory | `app/(dashboard)/customers/page.tsx` |
| `/customers/[id]` | Customer detail | `components/customers/customer-detail.tsx` |
| `/projects` | Project pipeline | `app/(dashboard)/projects/page.tsx` |
| `/projects/[id]` | Project detail | `components/projects/project-detail.tsx` |
| `/estimates` | Estimate directory | `app/(dashboard)/estimates/page.tsx` |
| `/estimates/[id]` | Estimate workspace | `components/estimates/estimate-builder.tsx` |

---

## Patterns every page must inherit

Full spec: `docs/DESIGN_SYSTEM_V1.md`

1. **One primary question** (`lib/ui/entity-page-copy.ts`)
2. **Light card context header** — no dark gradients
3. **One context-aware primary CTA** (rounded-full)
4. **Max 3 KPIs** above the fold; depth → Analytics
5. **Max 3 AI insights** (compact + next action); depth → `/ai`
6. **Max 3 attention items**; hide strip when empty
7. **Progressive disclosure** — tabs, modal, overflow menu, collapsible details
8. **Single-line activity feeds** — chronological, lightweight
9. **`space-y-10`** page rhythm; whitespace when nothing needs attention

---

## Module workflow completion

| Step | Module | Status |
|------|--------|--------|
| 1 | Dashboard | ✅ Reference |
| 2 | Customers | ✅ Reference |
| 3 | Projects | ✅ Reference |
| 4 | Estimates | ✅ Reference |
| 5 | Proposals | Next — finish contractor workflow |
| 6 | Awarded job + Job costing | ✅ Reference — verify handoffs |
| 7 | Analytics | After Proposals — same phase |

Phase plan: `docs/validation/contractor-workflow/PHASE.md`

Each screen should naturally lead to the next. No new interaction vocabulary.

---

## Relationship to Design System v1

- **Product Standard v1** — validated reference routes (what we ship and trust)  
- **Design System v1** — patterns, components, limits (how we build everything else)

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| **1.0** | 2026-07-23 | Frozen after Product Validation PASS |
| **1.1** | 2026-07-23 | Estimates propagated (UX-3 approved); protection policy |
| **1.1 (locked)** | 2026-07-23 | Governance frozen; changes require product decision |
| **1.2** | 2026-07-23 | Workflow Momentum Rule; beta north star |
| **1.3 (complete)** | 2026-07-23 | Golden Question; CTA forward-or-block; governance closed |
