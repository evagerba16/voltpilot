# VoltPilot UX Refinement Phase

**Status:** Product Standard v1 **complete** — governance closed · build the product  
**North star:** Beta with real electrical contractors  
**Phase:** `docs/validation/contractor-workflow/PHASE.md`

---

## Executive summary

VoltPilot is **not ugly** — the visual language (cards, typography, gradients) is already strong. The problem is **information density**: every page tries to show everything it knows at once.

**Goal:** When a contractor opens VoltPilot, they immediately know:
- **Where they are**
- **What's most important**
- **What to do next**

Everything else fades into the background until needed.

**Design north star:** Calm, organized, intentional — comparable to Linear, Notion, Stripe Dashboard, Vercel, Raycast.

**UX-1 (`/dashboard`) is now the visual and interaction standard** for all remaining UX phases. Codified as **VoltPilot Design System v1** (`docs/DESIGN_SYSTEM_V1.md`).

---

## Product validation — complete

**Result:** PASS — zero Critical, zero High friction (2026-07-23)

| Artifact | Path |
|----------|------|
| Summary | `docs/validation/product-validation/SUMMARY.md` |
| Product Standard v1 (frozen) | `docs/PRODUCT_STANDARD_V1.md` |
| UX-3 plan | `docs/validation/ux-3/PLAN.md` |

---

## UX-3 — Estimates (approved)

Product Standard v1 propagated to `/estimates` and `/estimates/[id]`. Report: `docs/validation/ux-3/REPORT.md`

---

## Operating direction

**Product Standard v1 is complete.** Governance is closed.

**The Golden Question:** *How does this help the contractor finish today's work?*

**Mission:** Help contractors get home earlier because paperwork got done faster.

**Build:** Finish workflow → production readiness → beta. See `docs/validation/contractor-workflow/PHASE.md`.

---

## Design philosophy (canonical — applies to every page)

| Principle | Implementation |
|-----------|----------------|
| **One primary question per page** | Define it in the page header; remove competing headlines |
| **Five-second rule** | Where am I · what's important · what next — within 5 seconds |
| **One Breath Rule** | A contractor should understand any page within one breath |
| **Progressive disclosure** | Summary first → expand/tabs for detail; keep all capability |
| **AI assists, doesn't dominate** | Top insights + next actions on entity pages; depth in Volt AI |
| **Whitespace is a feature** | Avoid filling empty space simply because it's available |
| **One focal point** | Single primary CTA above the fold where action is needed |
| **Calm whitespace** | Increase vertical rhythm (`space-y-10` on dashboard); reduce gradient stacking |
| **No duplicate information** | If it lives on Analytics or Volt AI, don't repeat on Dashboard |

Permanent copy also lives in **`docs/CANONICAL_SPEC.md`** and **`.cursor/rules/canonical-spec.mdc`**.

---

## UX-1 completion summary (approved)

| Deliverable | Status |
|-------------|--------|
| Light hero + display name + time greeting | ✅ |
| One primary CTA (New Estimate) | ✅ |
| Max 3 KPIs + View Analytics | ✅ |
| Max 3 AI insights + next action each | ✅ |
| Lightweight chronological activity | ✅ |
| Briefing/Copilot/full insights → Volt AI | ✅ |
| Validation report | `docs/validation/ux-1/REPORT.md` |

---

## Page-by-page UX audit

For each page: **purpose**, **5-second clarity**, **remove**, **collapse**, **distractions**, **focus first**.

### Legend

| Rating | Meaning |
|--------|---------|
| ✅ | Purpose obvious quickly |
| ◐ | Partially clear |
| ✗ | Overwhelming or unclear |

---

### `/` — Marketing landing

| | |
|--|--|
| **Primary question** | "What is VoltPilot and is it for me?" |
| **5-second clarity** | ✅ |
| **Remove** | — |
| **Collapse** | — |
| **Distractions** | Multiple equal-weight CTAs (minor) |
| **Focus first** | Hero value prop + Get Started |
| **Priority** | P3 — already strong |

---

### `/login`, `/subscribe`, `/forgot-password`

| | |
|--|--|
| **Primary question** | "Sign in" / "Subscribe" / "Reset password" |
| **5-second clarity** | ✅ |
| **Priority** | P3 |

---

### `/dashboard` — **Highest priority**

| | |
|--|--|
| **Primary question** | **"What does this contractor need to know today?"** |
| **5-second clarity** | ✗ — too many competing sections |
| **Current stack (top → bottom)** | Hero → Daily AI Briefing → Copilot → **6 KPI cards** → Quick actions (6) → Upcoming + Activity → **Full AI Insights panel** |
| **Remove from dashboard** | Full `AiInsightsPanel`; large Daily Briefing body; duplicate copilot if on `/ai` |
| **Collapse** | Secondary KPIs (show 3, "View all metrics" → Analytics); briefing → 2–3 bullets max |
| **Distractions** | Three AI surfaces; 6 KPIs; gradient hero + violet briefing + insights = visual noise |
| **Focus first** | Time-aware greeting + name → **Today's priorities** (3 items max) → 3 KPIs → activity feed |

**Greeting bugs (confirmed in code):**
- `dashboard-hero.tsx` uses `greetingName(userEmail)` — parses email local part → can show **"Eva16"** instead of **"Eva Gerba"**
- No time-of-day greeting in hero ("Welcome back" only)
- `daily-briefing.ts` hardcodes **"Good morning"** regardless of timezone

**Fix (UX phase):** Use `team_members.display_name` from team context; client timezone for Good Morning/Afternoon/Evening; hide internal IDs.

#### Dashboard — proposed layout

```
┌─────────────────────────────────────────────────────────────┐
│  Good afternoon, Eva Gerba                    [Org name]    │
│  Here's what needs your attention today.                    │
├─────────────────────────────────────────────────────────────┤
│  TODAY'S PRIORITIES (max 3)                                 │
│  • Proposal viewed — Riverside Medical — Follow up          │
│  • Estimate draft due — Summit Tower — Review margin        │
│  • Change order pending approval — Phase 2                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Pipeline │ │ Active   │ │ Proposals│  [View analytics →]│
│  │ $1.2M    │ │ 8 jobs   │ │ 3 sent   │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
├─────────────────────────────────────────────────────────────┤
│  AI INSIGHTS (2–3 cards)          [View all AI insights →]  │
│  ┌────────────────────┐ ┌────────────────────┐              │
│  │ Margin risk on…    │ │ Follow up on…      │              │
│  └────────────────────┘ └────────────────────┘              │
├──────────────────────────────┬──────────────────────────────┤
│  RECENT ACTIVITY             │  UPCOMING JOBS               │
│  (compact list)              │  (compact list)              │
└──────────────────────────────┴──────────────────────────────┘
```

**Removed from dashboard:** Daily AI Briefing panel (move summary to Volt AI); Copilot panel (Volt AI only); KPIs 4–6; full insights grid.

---

### `/ai` — Volt AI

| | |
|--|--|
| **Primary question** | "How is my business doing and what should I focus on?" |
| **5-second clarity** | ◐ — rich but appropriate here |
| **Remove** | — |
| **Collapse** | Historical trends, forecasts → accordions |
| **Distractions** | Emoji section headers (optional tone-down) |
| **Focus first** | Business health score + top 3 recommended actions |
| **Priority** | P2 — receive content moved **from** dashboard |

**Receives from dashboard:** Daily briefing (full), copilot suggestions, extended AI insights.

---

### `/customers` — list

| | |
|--|--|
| **Primary question** | "Who are my customers and who needs attention?" |
| **5-second clarity** | ✅ |
| **Collapse** | — |
| **Focus first** | Search + status filter + scannable rows |
| **Priority** | P3 |

---

### `/customers/[id]` — **High priority**

| | |
|--|--|
| **Primary question** | "Who is this customer and what's the status of our work together?" |
| **5-second clarity** | ◐ — everything visible at once |
| **Current stack** | Header → Summary KPIs → Open items → Timeline → Notes → Documents → Projects ‖ Contact sidebar + AI insights |
| **Remove** | Duplicate contact (header + sidebar) |
| **Collapse** | **Tabs:** Overview · Activity · Notes & docs · Projects — default Overview only |
| **Distractions** | 7 sections on first paint; AI panel competes with summary |
| **Focus first** | Company name + status + **open contract value** + **next action** |

#### Customer profile — proposed layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Customers    [Avatar] Acme Electric    [Lead ▼]  [Edit]  │
│  Jane Smith · jane@acme.com                                 │
├─────────────────────────────────────────────────────────────┤
│  Overview │ Activity │ Notes & files │ Projects             │
├─────────────────────────────────────────────────────────────┤
│  OPEN CONTRACT VALUE │ REVENUE │ ACTIVE PROJECTS           │
│  $84,500             │ $210k   │ 2                           │
├─────────────────────────────────────────────────────────────┤
│  OPEN ITEMS (estimates + proposals) — compact               │
│  NEXT ACTION: Send follow-up on proposal #1042              │
└─────────────────────────────────────────────────────────────┘
(Activity tab: timeline · Notes tab: notes + documents · etc.)
```

---

### `/projects` — list

| | |
|--|--|
| **Primary question** | "What's in my pipeline?" |
| **5-second clarity** | ✅ |
| **Priority** | P3 |

---

### `/projects/[id]` — **High priority**

| | |
|--|--|
| **Primary question** | "What's the status of this job and what do I do next?" |
| **5-second clarity** | ✗ — long scroll, no single focal action |
| **Current stack** | Dark hero → KPI grid → AI insights → Job costing → COs → Logs → Details → Estimates ‖ Timeline + contact |
| **Remove** | Complexity score / insights summary redundancy |
| **Collapse** | Field sections (costing, COs, logs) → **tabs:** Overview · Job costing · Field logs |
| **Distractions** | AI panel before operational data; 8+ sections |
| **Focus first** | **Status** · **Budget health** · **Next action** CTA |

#### Project detail — proposed layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Projects   AWARDED   Riverside Medical Center            │
│  Acme Electric · $1.25M est.              [Edit] [Archive]│
├─────────────────────────────────────────────────────────────┤
│  STATUS: On track │ BUDGET: 72% used │ NEXT: Log today's work│
├─────────────────────────────────────────────────────────────┤
│  Overview │ Estimates & proposals │ Job costing │ Field    │
├─────────────────────────────────────────────────────────────┤
│  (Overview: progress bar, timeline snippet, customer link)  │
└─────────────────────────────────────────────────────────────┘
```

---

### `/estimates` — list

| | |
|--|--|
| **Primary question** | "Which estimates need work?" |
| **5-second clarity** | ✅ |
| **Priority** | P3 |

---

### `/estimates/[id]` — **High priority**

| | |
|--|--|
| **Primary question** | "Build and finalize this bid." |
| **5-second clarity** | ◐ — powerful but cluttered |
| **Distractions** | Toolbar: 10+ buttons; inline AI review card + sections dense |
| **Collapse** | Assemblies library → drawer; templates/shortcuts → menus |
| **Focus first** | Line items + live total; single **Review** AI entry |
| **Priority** | P1 — daily-use screen |

#### Estimate builder — proposed structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Estimates   Summit Tower — Rough-in    Draft   [Saved ✓] │
│  Customer · Project links                                   │
├─────────────────────────────────────────────────────────────┤
│  [Review with AI]  [Add proposal]  [Save]     [··· more]    │
├──────────────────────────────┬──────────────────────────────┤
│  LINE ITEMS (categories)     │  SUMMARY (sticky)            │
│  increased section spacing   │  selling price prominent     │
└──────────────────────────────┴──────────────────────────────┘
```

---

### `/proposals` — list

| | |
|--|--|
| **Primary question** | "What's out with customers?" |
| **5-second clarity** | ✅ |
| **Priority** | P3 |

---

### `/proposals/[id]` — **Medium priority**

| | |
|--|--|
| **Primary question** | "Is this proposal ready to send?" |
| **5-second clarity** | ◐ |
| **Remove** | One of three AI blocks (merge readiness panel) |
| **Collapse** | Workflow/analytics → tabs: Edit · Preview · Activity |
| **Focus first** | Preview + **Send** |
| **Priority** | P2 |

---

### `/analytics`

| | |
|--|--|
| **Primary question** | "How is the business performing?" |
| **5-second clarity** | ◐ — appropriate depth for this page |
| **Receives from dashboard** | Secondary KPIs, revenue/profit detail, forecasts, AI coach |
| **Focus first** | Executive overview + date filter |
| **Priority** | P2 — absorb dashboard analytics |

---

### `/settings/*`

| | |
|--|--|
| **Primary question** | "Configure my company / team / billing." |
| **5-second clarity** | ✅ |
| **Priority** | P3 — minor spacing consistency pass |

---

### `/p/[token]` — Customer portal

| | |
|--|--|
| **Primary question** | "Should I approve this proposal?" |
| **5-second clarity** | ✅ — **north star for internal UI quality** |
| **Priority** | P3 — don't regress; reference for spacing/typography |

---

## Cross-cutting issues

| Issue | Pages affected | Fix |
|-------|----------------|-----|
| Email-derived display name | Dashboard hero, daily briefing | Use `display_name` from team context |
| Hardcoded "Good morning" | Daily briefing | Timezone-aware greeting |
| AI duplication | Dashboard, `/ai`, Analytics, entity pages | Dashboard: 2–3 insights; rest on Volt AI |
| No tabs/accordions | Customer, project detail | Introduce shared `PageTabs` pattern |
| Gradient hero stacking | Dashboard, project detail | One hero style; lighter treatment on dashboard |
| Misleading quick actions | Dashboard | Fix in connectivity phase OR hide until honest |
| Entity graph gaps | Estimate, proposal headers | Links only — **out of scope** unless approved as bugfix |

---

## Visual design system refinements

Apply globally (no new features):

| Token | Current | Proposed |
|-------|---------|----------|
| Page vertical rhythm | `space-y-6` / `space-y-8` mixed | Standardize `space-y-8` page, `space-y-6` within sections |
| Section headers | Mixed `text-base` / `text-lg` | `text-sm font-medium uppercase tracking-wide` label + `text-lg font-semibold` title |
| Card padding | `p-5` / `p-6` / `p-8` mixed | `p-6` default, `p-8` hero only |
| Primary buttons | Multiple per toolbar | One primary; rest outline or `···` menu |
| Empty states | Good | Ensure every collapsed section has one |
| Dark gradient heroes | Dashboard + project | Dashboard: **light** hero; project: keep dark OR unify to light |

---

## Prioritized improvement list

### P0 — Dashboard & identity (Week 1)

| # | Improvement | Impact |
|---|-------------|--------|
| 1 | Redesign dashboard around "what needs attention today" | Highest daily-use surface |
| 2 | Fix greeting: timezone + `display_name` (not email parse) | Trust / polish |
| 3 | Reduce KPIs to 3; link to Analytics | Cognitive load |
| 4 | Replace AI briefing + copilot + full insights → **2–3 insight cards + link to `/ai`** | Removes "AI page" feel |
| 5 | Increase whitespace; simplify hero (no dark gradient) | Calm premium feel |

### P1 — Entity detail progressive disclosure (Week 2)

| # | Improvement | Impact |
|---|-------------|--------|
| 6 | Customer profile tabs (Overview / Activity / Notes / Projects) | Scannability |
| 7 | Project detail: status + budget + next action header; tabbed costing/logs | Job focus |
| 8 | Estimate builder: toolbar cleanup, sticky summary, section spacing | Daily estimator UX |
| 9 | Shared `PageTabs` / `CollapsibleSection` components | Consistency |

### P2 — AI & analytics redistribution (Week 3)

| # | Improvement | Impact |
|---|-------------|--------|
| 10 | Move full briefing + copilot to Volt AI | Single AI home |
| 11 | Move secondary dashboard KPIs/charts to Analytics | Right page for depth |
| 12 | Proposal editor: merge 3 AI blocks → one readiness panel | Send-flow clarity |
| 13 | Entity AI insight panels → smaller strip or collapsed by default | Reduce noise |

### P3 — Polish pass (Week 4)

| # | Improvement | Impact |
|---|-------------|--------|
| 14 | Global typography + card + button audit | Consistency |
| 15 | List pages micro-spacing alignment | Cohesion |
| 16 | Settings sub-nav polish | Minor |
| 17 | Authenticated screenshots refresh | Doc sync |

---

## Implementation plan

**Constraint:** No new functionality. Refactor layout, visibility, and existing components only.

### Phase UX-1: Foundation (3–4 days)

**Files (indicative):**
- `components/dashboard/dashboard-home.tsx` — restructure layout
- `components/dashboard/dashboard-hero.tsx` — greeting, name, light hero
- `components/dashboard/dashboard-kpi-grid.tsx` — limit visible KPIs
- `lib/teams/queries.ts` / `dashboard/page.tsx` — pass `displayName`
- New: `components/ui/page-tabs.tsx`, `components/ui/collapsible-section.tsx` (layout primitives only)

**Deliverables:** Dashboard redesign; greeting fix; shared tab primitive.

**Validation:** Manual QA dashboard; no new routes; `npm run build`.

---

### Phase UX-2: Customer & project detail (4–5 days) — **PLANNED**

**Status:** Planning only — **do not implement until UX-2 is explicitly approved**

**Primary questions:**
- `/customers/[id]` → *Who is this customer and what needs attention?*
- `/projects/[id]` → *What is the current state of this project?*

#### Current problems (from code audit)

**Customer detail** (`components/customers/customer-detail.tsx`):
- Gradient hero + summary panel + open items + timeline + notes + documents + projects + contact sidebar + full AI panel — **all visible at once**
- Two-column layout stacks 8+ sections without tabs
- AI insights compete with open items for attention

**Project detail** (similar density — see `components/projects/project-detail.tsx`):
- Budget, job costing, estimates, proposals, AI insights, and metadata panels coexist above the fold

#### Proposed approach (apply UX-1 standard)

| Pattern from UX-1 | Apply to UX-2 |
|-------------------|---------------|
| Light card hero (no dark gradient) | Customer/project name + status + one-line context |
| One primary CTA | Customer: **New Project** · Project: **Open Estimate** or **Add Job Log** (context-dependent) |
| Max 3 “attention” items above fold | Open items / blockers only — not full timeline |
| Progressive disclosure | **Tabs:** Overview · Activity · Notes & Docs · Projects/Job costing |
| AI compact strip | Max 3 insights + next action → link to Volt AI for depth |
| Whitespace | `space-y-10`; collapse empty sections |

#### Tab structure (customer)

```
[Hero: Company name · status · primary CTA: New Project]

[Attention strip: max 3 open items — estimates/proposals needing action]

[Tabs]
  Overview    — Summary KPIs (3 max), contact sidebar collapsed to card
  Activity    — Chronological timeline only (lightweight, not analytical)
  Notes & Docs — Notes + documents panels
  Projects    — Project list for this customer
```

#### Tab structure (project)

```
[Hero: Project name · status · customer link · primary CTA: context action]

[Attention strip: estimate status, change orders pending, margin flag]

[Tabs]
  Overview    — Key dates, value, status progression
  Estimate    — Linked estimate(s) + compact AI insight
  Job costing — Logs, change orders, actuals (existing panels, tabbed)
  Proposals   — Proposal list + status
```

#### Files to touch (UX-2 implementation)

- `components/customers/customer-detail.tsx` — tabbed layout, hero refactor
- `components/projects/project-detail.tsx` — focus header + tabs
- `components/customers/customer-ai-insights-panel.tsx` — compact variant (mirror dashboard)
- `components/projects/project-ai-insights-panel.tsx` — compact variant
- Optional shared: `components/ui/entity-tabs.tsx` (if no existing tab primitive fits)

#### Success criteria (UX-2)

- [ ] Five-second + One Breath clarity on customer and project detail
- [ ] One primary CTA per page
- [ ] AI insights show next actions; full panel collapsed or max 3 visible
- [ ] Activity/timeline feeds chronological only — no trend copy
- [ ] `npm run build` + manual QA on `/customers/[id]`, `/projects/[id]`
- [ ] No new routes, DB, or workflow changes

#### Estimate

4–5 dev-days · ship customer detail first, then project detail

**Deliverables:** Progressive disclosure on two highest-traffic detail pages.

**Validation:** Manual QA `/customers/[id]`, `/projects/[id]`.

---

### Phase UX-3: Estimate & proposal cleanup (3–4 days)

**Files:**
- `components/estimates/estimate-builder.tsx` — toolbar `···` menu, spacing
- `components/proposals/proposal-editor.tsx` — merge AI readiness UI

**Deliverables:** Cleaner builder; single proposal AI readiness block.

---

### Phase UX-4: AI redistribution & analytics (2–3 days)

**Files:**
- `components/dashboard/dashboard-home.tsx` — remove moved panels
- `components/ai/volt-ai-advisor-dashboard.tsx` — receive briefing/copilot
- `components/analytics/analytics-executive-overview.tsx` — optional secondary KPIs

**Deliverables:** Dashboard calm; Volt AI is the AI home; Analytics owns depth.

---

### Phase UX-5: Global polish (2–3 days)

- Spacing/typography pass via shared tokens in `lib/ui/form-classes.ts`
- Empty state audit
- Screenshot refresh → `docs/screenshots/`
- `npm run docs:export` — sync handbook UX notes only (no new doc files)

**Total estimate:** ~14–19 dev-days (can ship incrementally by P0→P3).

---

## Feature Approval Gate (UX Refinement)

| Gate | Answer |
|------|--------|
| **User value** | Contractors spend daily time in dashboard, estimates, profiles — reducing overload saves time and builds trust |
| **Frequency** | Dashboard + estimate builder: **daily**; profiles: **weekly** |
| **Simplicity** | Extend existing components; tabs/collapse — no new data or routes |
| **Product alignment** | Matches audit connectivity/UX principles; no new modules |
| **Engineering impact** | Low–medium; mostly component layout; risk: regression on mobile |
| **Success criteria** | 5-second clarity ✅ on dashboard; user testing "calm/not overwhelming"; build + manual QA pass |

---

## Out of scope (this phase)

- New features (notifications, entity links, proposals panel — separate phases)
- New AI capabilities
- Database or API changes
- Copilot Sprint 2A changes

---

## Approval status

- [x] **P0 dashboard redesign** — UX-1 complete
- [x] **Greeting + display name** — shipped
- [x] **AI redistribution** — dashboard → Volt AI
- [x] **Tab pattern** for customer/project detail — UX-2 complete
- [x] **UX Stabilization** — friction fixes on Dashboard, Customers, Projects
- [x] **Design System v1 frozen** — `docs/DESIGN_SYSTEM_V1.md`
- [x] **Product validation** — PASS; Product Standard v1 frozen
- [x] **UX-3** — Estimates (approved; Product Standard propagated)
- [ ] **Finish contractor workflow** — Proposals + Analytics + handoffs
- [ ] **End-to-end journey validation** — new customer through analytics
- [ ] **Beta with real contractors** — north star milestone

**Feature gate:** Faster · more accurate · less stress — or don't build it.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-08-03 | Initial UX Refinement Phase proposal |
| 1.1 | 2026-08-04 | UX-1 complete; canonical principles (One Breath, Whitespace); UX-2 plan |

*After approval and each UX sub-phase: update handbook §6 module notes + `npm run docs:export` — no new documentation files unless scope changes.*
