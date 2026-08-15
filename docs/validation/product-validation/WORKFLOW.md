# Complete Contractor Workflow — Validation Checklist

Use this checklist during the product validation period. Check each step only after **actually performing it** in the running app.

**Friction:** Log issues in `friction-log.json` at the moment you notice them—not after the session.

**Severity when logging:**
- **critical** — cannot complete the task
- **high** — significant slowdown, painful workaround
- **medium** — noticeable but not blocking daily work
- **low** — minor annoyance

**Do not log:** feature ideas, visual polish, hypothetical improvements.

---

## Prerequisites

- [ ] Dev or staging environment running (`npm run dev`)
- [ ] Logged in as a contractor-role test account
- [ ] Friction log open: `docs/validation/product-validation/friction-log.json`

---

## Workflow steps

### 1. Morning dashboard check

**Route:** `/dashboard`

- [ ] Understood primary question within one breath
- [ ] Identified today's most important item without scrolling past hero + KPIs
- [ ] Primary CTA destination matched what you needed (or was clearly the right next step)
- [ ] AI insights (if any) had actionable next steps—not just information
- [ ] Upcoming jobs and recent activity scannable at a glance

**Log friction if:** overload, wrong CTA destination, couldn't prioritize in 5 seconds — **only if it slowed you down**.

---

### 2. Customer directory

**Route:** `/customers`

- [ ] Found or added a customer without unnecessary clicks
- [ ] List intro and filters felt task-focused, not feature-heavy
- [ ] Search/filter behavior matched expectation

**Log friction if:** couldn't add customer efficiently, list felt dense or unclear.

---

### 3. Customer detail

**Route:** `/customers/[id]`

- [ ] Hero answered who + what needs attention
- [ ] Attention strip (if shown) led to the right next action
- [ ] Overview tab: 3 metrics max, no duplicate contact noise
- [ ] Switched tabs; refreshed page — tab persisted via URL
- [ ] Projects tab: project list without redundant open-items duplication

**Log friction if:** duplicate info, lost tab state, couldn't find next action.

---

### 4. Create or open project

**Routes:** `/projects/new`, `/projects/[id]`

- [ ] Created project from customer OR opened existing from dashboard/projects list
- [ ] Projects list: 3 KPI snapshot (not 6 cards)
- [ ] Project hero: status + customer context clear
- [ ] Primary CTA matched project state (estimate vs job log vs view estimates)
- [ ] CTA that switches tabs scrolled to the tab panel

**Log friction if:** wrong CTA, tab switch didn't reveal content, list overload.

---

### 5. Estimate path (observe only — do not redesign)

**Routes:** `/estimates`, `/estimates/[id]` *(current UI — not yet DS v1)*

- [ ] Reached estimate from project detail or dashboard flow
- [ ] Completed or reviewed pricing work needed for workflow
- [ ] Note any friction **only if it blocked the workflow** — DS propagation comes later

**Log friction if:** navigation broke the flow or you couldn't complete estimate work. Do not log builder polish items unless they blocked you.

---

### 6. Proposal path (observe only)

**Routes:** `/proposals`, `/proposals/[id]` *(current UI — not yet DS v1)*

- [ ] Reached proposal from estimate or project if applicable
- [ ] Note blocking friction only

---

### 7. Job costing / field (if project is active)

**Route:** `/projects/[id]?tab=job-costing`

- [ ] Found job costing tab from primary CTA or navigation
- [ ] Job logs / change orders accessible without hunting

**Log friction if:** couldn't reach field data from project context.

---

### 8. Return to dashboard

**Route:** `/dashboard`

- [ ] Recent activity reflected work from this session
- [ ] Dashboard still felt calm—not noisier after deep work
- [ ] Would use this as tomorrow's starting point

**Log friction if:** activity didn't update, dashboard felt inconsistent with entity pages.

---

## Session summary (fill after workflow)

| Field | Value |
|-------|-------|
| Date | |
| Environment | dev / staging / prod |
| Steps completed | 1–8 (list any skipped) |
| Friction entries added | count |
| Blocking issues? | yes / no |
| Ready for DS v1 propagation? | yes / no / needs fixes |

Copy summary to `SUMMARY.md` when validation period completes. Update workflow completion checkboxes and severity sections from `friction-log.json`.
