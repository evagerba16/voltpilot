# UX Stabilization Report

**Phase:** Post UX-2 usability stabilization (pre UX-3)  
**Date:** 2026-07-23  
**Scope:** Dashboard, Customers list/detail, Projects list/detail  
**Out of scope:** Estimates, Proposals propagation; UX-3 estimate builder

## Method

Simulated a contractor daily flow through code review and a Playwright walkthrough script (`npm run ux-stabilization:walkthrough`). Friction was logged against navigation depth, information density, duplicate content, and CTA destination accuracy.

## Friction Log (before fixes)

| Severity | Page | Issue | Detail |
|----------|------|-------|--------|
| High | Dashboard → Customers | Extra click to add customer | "Add your first customer" landed on list, not add dialog |
| High | Dashboard | Weak default CTA | "New estimate" went to estimates list, not an estimating project |
| High | Projects list | Information overload | 6 KPI cards on list page (UX-1 max-3 violated) |
| Medium | Project detail | Primary CTA tab switch | "Add job log" switched tab but did not scroll to panel |
| Medium | Customer detail | Projects tab duplication | Open items panel duplicated attention strip + projects list |
| Medium | Customer detail | Contact duplication | Hero showed name/email; sidebar repeated avatar + email |
| Medium | Entity detail | Tab state lost on refresh | Active tab not persisted in URL |
| Low | Dashboard | Upcoming jobs density | 3-line rows vs 1-line activity feed pattern |
| Low | List pages | Verbose intro copy | PageIntro text was feature-oriented, not task-oriented |

## Fixes Applied

### Dashboard
- **Add customer CTA** → `/customers?action=add` opens add dialog on arrival
- **Default "New estimate" CTA** → `/projects?status=Estimating` (projects ready for pricing)
- **Upcoming jobs** → single-line rows aligned with Recent Activity pattern

### Customers
- **`?action=add`** wired through page → `CustomersView` opens dialog; URL cleaned on close
- **Overview contact** → compact "Phone & address" card (hero keeps name/email)
- **Projects tab** → removed duplicate `CustomerOpenItemsPanel` (attention strip covers open items)
- **Tab persistence** → `?tab=` on customer detail URLs

### Projects
- **List page KPIs** → compact 3-card "Pipeline snapshot" with Analytics link (matches dashboard)
- **Tab persistence** → `?tab=` on project detail URLs
- **Primary CTA** → tab switch scrolls to tab panel (job log / estimate)

### Shared
- `lib/ui/entity-tab-ids.ts` — canonical tab IDs + parser for server/client sync
- Shortened list page `PageIntro` copy for task clarity

## Verification

```bash
npm run ux-1:verify   # 20/20
npm run ux-2:verify   # 13/13
npm run build         # PASS
npm run ux-stabilization:walkthrough  # optional; requires BETA_TEST_* credentials
```

## Deferred (not in this phase)

- **Estimates & Proposals** — design language propagation waits until stabilization is approved
- **UX-3** — estimate builder cleanup not started
- **Customers list filter density** — acceptable for power users; no change unless walkthrough surfaces new friction

## Contractor flow (post-fix)

1. **Morning check** — Dashboard: 3 KPIs, attention insights, upcoming jobs, activity — one screen, one primary CTA
2. **New customer** — Dashboard CTA → add dialog (no extra click)
3. **Customer follow-up** — Detail hero + attention strip → tab or link to project/estimate
4. **Project work** — Detail CTA switches to Estimate or Job costing tab with scroll
5. **Pipeline scan** — Projects list: 3 KPIs, filter, table — not 6 stat cards

## Recommendation

Stabilization fixes are scoped to observed friction only. **Review these pages in the product**, then approve before propagating the design language to Estimates and Proposals or starting UX-3.
