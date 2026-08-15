# VoltPilot Design System v1

**Status:** Frozen — governance locked (changes require product decision)  
**Effective:** 2026-07-23  
**Reference implementations:** `/dashboard`, `/customers`, `/customers/[id]`, `/projects`, `/projects/[id]`, `/estimates`, `/estimates/[id]`  
**Priority:** Customer value over governance evolution. See `docs/PRODUCT_STANDARD_V1.md` § Governance.

---

## Purpose

VoltPilot Design System v1 defines how every page in the product should look, feel, and behave. It was derived from real contractor workflows—not hypothetical polish—and validated through UX-1, UX-2, and usability stabilization.

**Rule:** Every new page inherits DS v1. **Workflow Momentum:** primary task completion → next logical action in the contractor chain. No dead ends.

---

## Core principles

| Principle | Rule |
|-----------|------|
| **One question per page** | Define the primary question in copy (`lib/ui/entity-page-copy.ts`). Remove competing headlines. |
| **Five-second rule** | Contractor knows: where am I, what's important, what to do next. |
| **One Breath Rule** | Any page understandable within one breath. |
| **Progressive disclosure** | Summary first; detail in tabs, expand, or secondary pages. |
| **One primary CTA** | Single rounded-full primary button above the fold. Context-aware destination. |
| **Max 3 KPIs** | Above-the-fold metrics capped at three. Secondary metrics → Analytics. |
| **Max 3 AI insights** | Compact strip with category + next action. Depth → Volt AI (`/ai`). |
| **Max 3 attention items** | Entity attention strip shows only actionable open items. Hide when empty. |
| **Whitespace is a feature** | `space-y-10` between page sections. Do not fill empty space. |
| **No duplication** | If data appears in hero, do not repeat in sidebar. If on Analytics, not on Dashboard. |
| **Chronological activity** | Activity feeds are single-line, lightweight, time-ordered—not analytical. |
| **AI assists, doesn't dominate** | Surface top insights + next action; full AI lives on Volt AI. |

---

## Page types

### 1. Dashboard (`/dashboard`)

**Primary question:** *What do I need to know today?*

```
[Light card hero — greeting, org, primary question, context-aware CTA, Analytics + AI links]
[Key metrics — max 3 KPI cards + View Analytics]
[AI insights — max 3 categorized cards with next actions]
[Upcoming jobs | Recent activity — single-line rows]
```

**Do not include on dashboard:** Daily briefing body, copilot panel, full AI insights grid, quick actions grid, 4+ KPIs.

**Reference:** `components/dashboard/dashboard-home.tsx`, `dashboard-hero.tsx`, `dashboard-kpi-grid.tsx`

---

### 2. List pages (`/customers`, `/projects`, `/estimates`, …)

**Primary question:** Task-oriented — e.g. *Who needs follow-up?* / *What's in my pipeline?*

```
[PageIntro — one sentence, task-focused]
[Optional: compact 3-KPI snapshot + link to Analytics]
[Filter bar + table or card list]
[Single primary action in header — e.g. Add customer]
```

**Rules:**
- Max 3 KPI cards on list pages (use `compact` mode on stats components)
- No duplicate Analytics links in section headers
- Deep links via query params (`?status=`, `?action=add`)

**Reference:** `app/(dashboard)/projects/page.tsx`, `components/projects/projects-stats.tsx` (`compact`)

---

### 3. Entity detail pages (`/customers/[id]`, `/projects/[id]`, …)

**Primary question:** Per entity in `lib/ui/entity-page-copy.ts`

```
[← Back link]
[Light card hero — entity label, status badges, name, primary question, context line, ONE primary CTA]
[Needs attention strip — max 3 items; hidden when empty]
[Tabs — progressive disclosure]
  Overview    — max 3 KPIs/metrics, compact AI, lightweight activity snippet
  Domain tabs — Activity, Notes & Docs, Projects, Estimate, Job costing, Details, …
```

**Hero rules:**
- Light card (`rounded-2xl border bg-card shadow-sm`) — no dark gradients
- Display name from team context — never parse email for greeting/name
- Primary CTA is context-aware (draft estimate → continue; active job → job log; empty → create)
- Secondary actions (Edit, Archive, Delete) as ghost buttons below CTA

**Tab rules:**
- Use `EntityTabs` (`components/ui/entity-tabs.tsx`)
- Persist active tab in URL: `?tab=estimate`, `?tab=job-costing`, etc.
- Tab IDs defined in `lib/ui/entity-tab-ids.ts`
- Primary CTA that switches tabs must scroll to tab panel

**Reference:** `components/customers/customer-detail.tsx`, `components/projects/project-detail.tsx`

---

### 4. Workspace pages (`/estimates/[id]`, …)

**Primary question:** Per entity in `lib/ui/entity-page-copy.ts`  
**Goal:** Uninterrupted work — contractor attention stays on the primary canvas.

```
[← Back link]
[Context header — light card: label, status, inline title, primary question, context links]
[Toolbar — assemblies/tools · save status · ONE primary CTA · overflow menu]
[Optional compact context — bid price + margin only]
[Optional compact AI — max 3; hidden when none]
[Workspace grid — primary canvas (line items) | sticky summary sidebar]
```

**Workspace rules:**
- Main column is **work**, not navigation or analytics
- Secondary tools → modal drawer, overflow menu, or collapsible details
- No multi-column metric bars above the canvas
- Reuse `resolve*PrimaryAction()` pattern for context-aware CTA

**Reference:** `components/estimates/estimate-builder.tsx`, `components/estimates/estimate-workspace-header.tsx`

---

## Component inventory

| Component | Path | Use |
|-----------|------|-----|
| Light hero | Inline in entity/dashboard heroes | Page header + CTA |
| `DashboardKpiCard` | `components/dashboard/dashboard-kpi-card.tsx` | All KPI surfaces |
| `EntityTabs` | `components/ui/entity-tabs.tsx` | Entity detail navigation |
| `EntityAttentionStrip` | `components/ui/entity-attention-strip.tsx` | Max 3 actionable items |
| Compact AI | `*-ai-insights-compact.tsx` | Max 3 insights + next action |
| Workspace header | `estimate-workspace-header.tsx` | Context header + toolbar for workspaces |
| Workspace overflow | `estimate-builder-overflow-menu.tsx` | Secondary actions in modal menu |
| Primary action resolvers | `lib/dashboard/primary-action.ts`, `lib/estimates/primary-action.ts` | Context-aware CTA |
| Activity row | Single-line `truncate text-sm` pattern | Recent activity, upcoming jobs |
| `PageIntro` | `components/dashboard/page-main.tsx` | List page one-liner |
| `ListPageHeader` | `components/ui/list-page-header.tsx` | List title + primary action |
| `FilterBar` | `components/ui/filter-bar.tsx` | Search + filters on lists |
| `EmptyState` | `components/ui/empty-state.tsx` | Zero-data states |

---

## Layout tokens

| Token | Value | Notes |
|-------|-------|-------|
| Page section gap | `space-y-10` | Between major page blocks |
| Card | `rounded-2xl border border-border bg-card shadow-sm` | Default surface |
| Card padding | `p-6` default, `px-6 py-8 sm:px-8` hero | |
| Section title | `text-base font-semibold tracking-tight` | h2 in cards |
| Entity label | `text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground` | "Customer", "Project" |
| Primary CTA | `buttonVariants({ className: "gap-2 rounded-full" })` | One per page |
| KPI grid | `grid gap-4 sm:grid-cols-2 xl:grid-cols-3` | Max 3 columns |
| Activity row | `px-6 py-3.5`, single-line truncate | Match dashboard activity |

---

## AI surfaces

| Surface | Max items | Location | Depth link |
|---------|-----------|----------|------------|
| Dashboard insights | 3 | Dashboard home | `/ai` |
| Entity insights | 3 | Overview tab | `/ai` |
| Attention strip | 3 | Above tabs | Direct href per item |
| Full briefing / copilot | — | Volt AI only (`/ai`) | — |
| Analytics AI coach | — | Analytics only | — |

**Insight categories:** Needs attention · Opportunity · Informational (`lib/ai/insight-category.ts`)

Every insight ends with a **next action** (link or button).

---

## URL conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| Entity tab | `/projects/[id]?tab=estimate` | Persist tab on refresh |
| Deep action | `/customers?action=add` | Open dialog on arrival |
| List filter | `/projects?status=Estimating` | Pre-filtered list |
| Analytics depth | `/analytics?section=projects` | Secondary metrics |

---

## Context-aware primary actions

Dashboard resolver: `lib/dashboard/primary-action.ts`

Priority order:
1. Empty portfolio → Add your first customer (`/customers?action=add`)
2. Open proposals needing follow-up → Follow up on proposal
3. Draft estimates → Continue estimate
4. Default → New estimate (`/projects?status=Estimating`)

Entity pages resolve CTA from entity state (draft estimate, active job, etc.).

---

## Module inheritance order (post-freeze)

Dashboard · Customers · Projects · Estimates — **complete**.

**Next:** Finish the contractor workflow (`docs/validation/contractor-workflow/PHASE.md`) — Proposals and Analytics using existing patterns; verify seamless handoffs.

**Product Stability Rule:** Validated standards remain stable. Change for customer feedback, measured usability problems, or new business requirements — not redesign appetite.

---

## Anti-patterns (do not ship)

- Dark gradient heroes on dashboard or entity pages
- 4+ KPI cards above the fold on any page
- Full AI insights panel on dashboard or entity overview
- Duplicate contact blocks (hero + sidebar with same fields)
- Empty attention strips with placeholder copy (hide instead)
- Email-derived display names
- Multiple equal-weight primary buttons in hero
- Analytical copy in activity feeds
- Page-specific tab systems (use `EntityTabs`)
- New pages that ignore `ENTITY_PRIMARY_QUESTIONS` pattern

---

## Validation & change control

| Change type | Process |
|-------------|---------|
| New page | Must follow DS v1 page type. No exceptions. |
| Real friction during validation | Log in `docs/validation/product-validation/friction-log.json` only |
| DS v1 amendment | Requires product approval + version bump (v1.1+) |
| Deviation from Product Standard | Requires documented unique workflow requirement + explicit approval |
| New interaction pattern | **Not allowed** — reuse existing page types and components |

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| **1.0** | 2026-07-23 | Frozen after UX Stabilization approval. Reference: Dashboard, Customers, Projects. |

*Canonical copy also in `docs/CANONICAL_SPEC.md` § Design System v1 · enforced via `.cursor/rules/design-system-v1.mdc`*
