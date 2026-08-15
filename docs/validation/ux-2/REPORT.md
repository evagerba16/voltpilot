# UX-2 Customer & Project Detail — Review Report

**Status:** Complete — awaiting review before UX-3  
**Generated:** 2026-08-04  
**Scope:** Customer and project detail progressive disclosure; pre-UX-2 dashboard refinements  
**Design standard:** UX-1 language (light hero, one CTA, tabs, compact AI, chronological activity)

---

## Stop point

**UX-2 is complete. Do not begin UX-3 until Customers and Projects pages are reviewed and approved.**

---

## Pre-UX-2 refinements (shipped with this release)

### Context-aware dashboard CTA

Replaced fixed "New Estimate" with `resolveDashboardPrimaryAction()` — priority order:

1. Add first customer (empty portfolio)
2. Create project (customers, no projects)
3. Follow up on proposal (sent 3+ days ago)
4. Continue draft estimate
5. Check proposal status (sent/viewed)
6. New estimate (default)

Hero shows action label, link, and one-line context.

### AI insight classification

Insights categorized as **Needs attention**, **Opportunity**, or **Informational**:

| Category | Examples |
|----------|----------|
| Needs attention | Review required, high risk, low margin |
| Opportunity | Generate proposal, missing assumptions |
| Informational | AI-suggested portfolio actions |

Dashboard compact panel uses calm category styling (not all-critical red/amber).

---

## UX-2: Customer detail (`/customers/[id]`)

**Primary question:** *Who is this customer and what needs attention?*

| Element | Implementation |
|---------|----------------|
| Light hero | Card layout — no gradient |
| Primary CTA | **New project** → `/projects/new?customer={id}` |
| Attention strip | Max 3 open proposals/estimates |
| Tabs | Overview · Activity · Notes & Docs · Projects |
| Compact AI | Max 3 insights with category tone |
| Activity | Chronological timeline (Activity tab only) |

Secondary actions (Edit, Delete) are ghost buttons — not competing with primary CTA.

---

## UX-2: Project detail (`/projects/[id]`)

**Primary question:** *What is the current state of this project?*

| Element | Implementation |
|---------|----------------|
| Light hero | Card layout — dark gradient removed |
| Context CTA | Continue estimate · Create estimate · Add job log · View estimates |
| Attention strip | Critical/warning AI insights (max 3) |
| Tabs | Overview · Estimate · Job costing |
| Overview KPIs | 3 primary metrics (compact grid) |
| Compact AI | Max 3 insights with category labels |
| Activity | Chronological timeline on Overview tab |

Job costing panels moved to **Job costing** tab (progressive disclosure).

---

## Build & QA

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run ux-2:verify` | Run after pull — static wiring checks |
| Manual QA | `/customers/[id]`, `/projects/[id]` recommended |

Artifact: [`qa-results.json`](./qa-results.json)

---

## Manual review checklist

- [ ] Dashboard CTA changes based on pipeline state (empty → customer → project → follow-up → draft)
- [ ] AI insights show category badges; dashboard does not feel uniformly urgent
- [ ] Customer page: one breath clarity — hero + attention + overview tab
- [ ] Project page: context CTA switches tab or links correctly
- [ ] All existing CRM/job costing capability reachable via tabs
- [ ] Mobile: tabs wrap; hero stacks cleanly

---

## Lessons learned

1. **Context beats constants** — A single smart CTA outperforms six quick-action pills.
2. **Category calms AI** — Not every insight is an emergency; classification reduces alert fatigue.
3. **Tabs preserve capability** — Notes, documents, and job costing remain — just not all at once.

---

## Next step

Review `/customers/[id]` and `/projects/[id]` in the browser. Approve UX-2 before UX-3 (estimate builder cleanup).

---

*Stopped per spec — UX-3 not started.*
