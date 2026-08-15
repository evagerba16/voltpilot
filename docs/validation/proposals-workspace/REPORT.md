# Proposals Workspace — Product Standard v1

**Status:** Complete — awaiting review  
**Scope:** `/proposals`, `/proposals/[id]` — layout and disclosure only (no new features)

---

## Objective

Propagate Product Standard v1 to Proposals. Treat the editor as a **workspace** for sending professional bids—not an information page. Preserve Estimate → Proposal workflow momentum.

---

## Changes

### Proposals list (`/proposals`)

| Pattern | Implementation |
|---------|----------------|
| Task-focused copy | PageIntro + list header aligned with Estimates |
| Max 3 KPIs | `ProposalsStats` compact mode — pipeline snapshot (3 cards) |
| Progressive disclosure | Org analytics panel removed from list; link to `/analytics` |

### Proposal workspace (`/proposals/[id]`)

| Pattern | Implementation |
|---------|----------------|
| Context header | `ProposalWorkspaceHeader` — light card, status, inline title, primary question, project/customer/estimate links |
| One primary CTA | `resolveProposalPrimaryAction()` — Send / Follow up / Preview / View project / Workflow by status |
| Progressive disclosure | Branding in `<details>`; internal notes & signatures collapsed; customer engagement & readiness review in `<details>` |
| Compact AI | `ProposalAiInsightsCompact` — max 3 quick checks; embedded Ask Volt AI panel |
| Lower density | Removed dark hero + 6-KPI grid; price/margin/readiness context strip only |
| Workspace focus | Edit column + sticky live preview; engagement analytics collapsed below |

### Toolbar consolidation

**Visible:** Save status · Edit/Preview · Primary CTA · Overflow (`···`)

**Overflow menu:** Save · Writing assistant · Workflow · View project/estimate/portal · PDF · Print · Duplicate · Archive · Delete

### New files

- `lib/proposals/primary-action.ts`
- `components/proposals/proposal-workspace-header.tsx`
- `components/proposals/proposal-ai-insights-compact.tsx`
- `components/proposals/proposal-builder-overflow-menu.tsx`

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm run ux-1:verify` | 20/20 PASS |
| Autosave / keyboard shortcuts | Preserved |
| Send dialog / workflow panel | Preserved |
| Writing assistant panel | Preserved (overflow) |
| PDF / print / portal | Preserved (overflow) |

---

## Not changed

- Proposal content fields, autosave, send logic, workflow service
- Customer portal / PDF generation
- Frozen reference pages (Dashboard, Customers, Projects, Estimates)
- Proposal acceptance → active job handoff (next workflow stage)

---

## Manual QA checklist

### List (`/proposals`)

- [ ] Pipeline snapshot shows 3 KPIs max
- [ ] Page copy is task-focused ("which proposals need to go out")
- [ ] Filter/search/create proposal still works
- [ ] Row click opens workspace

### Workspace — Draft proposal

- [ ] Light context header with editable title, status, project/customer links
- [ ] Price context strip shows value, margin, readiness score
- [ ] Quick checks show max 3 insights; Ask Volt AI opens slide-over (same page)
- [ ] Primary CTA is **Send to customer** when readiness passes, else **Preview proposal**
- [ ] Edit + live preview side-by-side; no hero/KPI wall blocking content
- [ ] Overflow reaches assistant, PDF, duplicate, delete
- [ ] Branding expandable without leaving workspace
- [ ] Customer engagement collapsed by default

### Workspace — Sent/Viewed proposal

- [ ] Primary CTA is **Follow up** → opens send dialog
- [ ] Edit locked message shown when appropriate

### Workspace — Accepted proposal

- [ ] Primary CTA is **View project** → navigates to project

### Estimate → Proposal handoff

- [ ] From finalized estimate, Add proposal still creates/opens proposal
- [ ] Proposal workspace links back to source estimate (overflow)

---

## Before / after (visual)

Screenshots should be captured manually in the running app:

| Screen | Before | After |
|--------|--------|-------|
| `/proposals` | 4 KPIs + org analytics panel above table | 3 KPI pipeline snapshot + task-focused copy |
| `/proposals/[id]` | Dark hero, 6 KPIs, full AI panel, 10+ toolbar buttons | Light header, price strip, 3 quick checks, single primary CTA + overflow |
| Edit mode | Content buried below metrics | Content + sticky preview above fold |

---

## Production readiness assessment

| Area | Status | Notes |
|------|--------|-------|
| Build | Ready | Production build passes |
| Types / lint | Ready | No new errors; pre-existing dashboard-kpi-grid warning unchanged |
| Autosave / send | Ready | Logic untouched |
| Permissions | Ready | Edit/send gates preserved |
| Mobile | Acceptable | Toolbar wraps; preview stacks on narrow viewports (same as Estimates) |
| E2E tests | Gap | No automated proposal workspace tests yet |
| Beta | Pending | Manual QA checklist above before contractor beta |

**Recommendation:** Approve after manual QA on one draft → send path. Next workflow task: proposal acceptance → active job.

---

*Awaiting review before proceeding to next workflow stage.*
