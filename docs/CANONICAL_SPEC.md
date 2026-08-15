# VoltPilot Canonical Specification

**Status:** Active — documentation mature; primary focus is build, validate, sync  
**Canonical export:** `docs/VOLTPILOT_COMPLETE_DOCUMENTATION_PACK.docx`  
**Editable source:** `docs/VOLTPILOT_COMPLETE_DOCUMENTATION_PACK.md`

This pack is the **single source of truth** for architecture, UX, AI strategy, production readiness, and long-term product vision.

**Do not create additional documentation** unless the product meaningfully changes. Update existing constituent files and regenerate the pack.

---

## Feature Approval Gate (required before implementation)

Every proposed feature or architectural change must pass **all five gates below**.  
**If any gate cannot be answered clearly: stop implementation and request clarification or a product decision.**

### 1. User value

| Question | Must answer |
|----------|-------------|
| What problem does this solve for an **electrical contractor**? | Specific jobsite or office pain — not engineering curiosity |
| How **often** will they use it? | Daily/weekly vs one-off; frequency justifies complexity |

### 2. Simplicity

| Question | Must answer |
|----------|-------------|
| Is there a **simpler way** using existing architecture? | Extend before inventing |
| Can an existing **component, service, or workflow** be extended? | No parallel systems when extension suffices |

### 3. Product alignment

| Question | Must answer |
|----------|-------------|
| Does this align with the **canonical vision and roadmap**? | See Product Audit §9, §11; approved phase sequence below |
| Does it improve **end-to-end workflow**? | customer → project → estimate → proposal → portal → job costing |

**Alignment details (from canonical pack):**

- **Architecture** — extend handbook §6 modules; `lib/*`, server actions, org-scoped RLS
- **UX** — entity graph, honest CTAs, design system; no duplicate insight panels
- **AI** — extend Copilot; no 4th estimate AI surface or extra portfolio coach
- **Production** — phase order, `PRODUCTION_LAUNCH_CHECKLIST.md`, frozen scopes
- **Vision** — AI-first electrical estimating wedge; connectivity before greenfield modules

### 4. Engineering impact

| Question | Must answer |
|----------|-------------|
| What are the **dependencies**? | Modules, migrations, APIs, third-party services |
| What are the **risks**? | Regression, RLS, billing, AI duplication, scope creep |
| **Technical debt or duplicate functionality?** | Must be **no** for duplicates — extend documented architecture instead |

### 5. Success criteria

| Question | Must answer |
|----------|-------------|
| How will we know the feature is **successful**? | Measurable contractor outcome or workflow improvement |
| What **validation/testing** is required? | verify scripts, build/tsc, manual QA, phase `REPORT.md` |

### Gate failure protocol

1. **Stop** — do not write code  
2. **Document** which gate(s) are unclear and why  
3. **Request** clarification or product decision OR update audit/handbook/roadmap first  
4. **Re-run gate** after decision; then implement  

If architecture or direction **intentionally** changes: update constituent docs → implement → `npm run docs:export`.

---

## UX Design Principles (canonical — apply to every page)

Established during **UX Refinement Phase UX-1**. `/dashboard` is the **visual and interaction standard** for all subsequent UX work.

| Principle | Rule |
|-----------|------|
| **One question per page** | Each page answers one primary question in the header. Remove competing headlines. |
| **Five-second rule** | Within five seconds the contractor knows: where am I, what's most important, what should I do next. |
| **One Breath Rule** | A contractor should understand any page within one breath. |
| **Progressive disclosure** | Keep all capability; reveal via tabs, expand, “View more”, or secondary pages — not all at once. |
| **AI assists, doesn't dominate** | Surface top insights and next actions; detailed AI lives in Volt AI. |
| **Whitespace is a feature** | Avoid filling empty space simply because it's available. |
| **Premium experience** | Clear hierarchy, generous whitespace, few competing focal points, calm presentation, high scanability. |
| **Product Stability Rule** | Validated standards remain stable. Change for customer feedback, measured usability problems, or new business requirements — not redesign appetite. |
| **Workflow Momentum Rule** | Primary CTA advances the workflow or explains why not; user never wonders what's next |

### The Golden Question

Every new feature: *How does this help the contractor finish today's work?*

VoltPilot's mission: help contractors **get home earlier** because paperwork got done faster.

**Product Standard v1 is complete.** No new governance principles unless a real customer problem proves the standard insufficient.

**Dashboard standard (UX-1):** Light card hero · primary question subtitle · **context-aware primary CTA** · max 3 KPIs · max 3 categorized AI insights · lightweight chronological activity · secondary links centralized in hero (Analytics, Volt AI).

**Entity pages (UX-2+):** Use `lib/ui/entity-page-copy.ts` for primary questions. Same hero/CTA/attention/tab patterns as dashboard.

**Product Standard v1 (frozen, governance locked):** `docs/PRODUCT_STANDARD_V1.md` — propagated to Dashboard, Customers, Projects, Estimates. Amendments require **product decision**. Development prioritizes **customer value**, not governance evolution.

**Design System v1:** `docs/DESIGN_SYSTEM_V1.md` — inherit on all new pages; same lock applies.

**North star:** Beta with real electrical contractors. Phase plan: `docs/validation/contractor-workflow/PHASE.md`. **Governance is complete** — build the product.

---

## Operating mode

| Priority | Activity |
|----------|----------|
| 1 | **Beta with real contractors** — production readiness, workflow completion, daily usefulness |
| 2 | Build only what passes the feature gate (faster · more accurate · less stress) |
| 3 | Validate (scripts, QA, phase reports) |
| 4 | Sync docs when product direction changes — not for governance refinement |

**North star:** Adoption and daily usefulness. Not architectural refinement or design system updates.

Regenerate exports: `npm run docs:export`

---

## Extend — never duplicate

| Instead of… | Extend… |
|-------------|---------|
| New estimate AI API/panel | `lib/copilot/orchestrator`, `EstimateCopilotPanel` |
| Another entity insights component | Shared insights pattern; merge existing four panels |
| Second notification path | Single notifications module (when Phase 3 starts) |
| Parallel query layer | Existing `lib/*/queries.ts` |
| New advisor home | Volt AI or dashboard briefing — not both plus Analytics coach |

---

## Phase sync (after every completed phase)

See **`docs/PHASE_SYNC_CHECKLIST.md`**. Minimum:

- Handbook, audit/roadmap, validation reports
- Screenshots in `docs/screenshots/` if UI changed
- `npm run docs:export` + commit sources and `.docx` together

---

## Constituent documents (update in place — do not fork)

| Document | Update when |
|----------|-------------|
| `VOLTPILOT_PRODUCT_AUDIT.md` | Roadmap, maturity, UX/production status |
| `VOLTPILOT_HANDBOOK.md` | Routes, modules, DB, API, env |
| `PRODUCTION_LAUNCH_CHECKLIST.md` | Launch gates |
| `validation/**/REPORT.md` | Phase completes |
| `docs/screenshots/` | Material UI changes |
| `lib/copilot/README.md` | Copilot API changes |

---

## Approved phase sequence

1. Phase 0 — Connectivity & Trust  
2. Phase 1 — Copilot validation & ship  
3. Phase 2 — AI consolidation  
4. Phase 3 — Notifications MVP  
5. Phase 4 — Mobile / field UX  
6. Phase 5+ — Scheduling, invoicing  

Reorder only after updating the audit.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-08-03 | Governance established |
| 1.1 | 2026-08-03 | Build/validate/sync mode; extend-not-duplicate; conflict protocol |
| 1.2 | 2026-08-03 | User value before engineering complexity gate |
| 1.3 | 2026-08-03 | Feature Approval Gate (5 gates, required before implementation) |
| 1.4 | 2026-08-04 | UX Design Principles (One Breath Rule, Whitespace is a feature); UX-1 dashboard standard |
