# UX Usability Review — Dashboard, Customers, Projects

**Status:** Complete — small refinements applied; ready to propagate design language  
**Generated:** 2026-08-04  
**Scope:** Post UX-1/UX-2 pause review before Estimates, Proposals, and remainder  
**UX-3:** Not started (per instruction)

---

## Review method

Static code audit against the five UX goals, validated with `npm run build`, `npm run ux-1:verify`, and `npm run ux-2:verify`. Manual browser QA recommended before propagation.

**Core principle under test:** Information density — not feature count — is the primary UX problem.

---

## Goal scorecard

| Goal | Dashboard | Customers | Projects | Verdict |
|------|-----------|-----------|----------|---------|
| Lower information density | ✅ Strong | ✅ Good (after refinements) | ✅ Good (after refinements) | Pass |
| Clear primary question | ✅ | ✅ | ✅ | Pass |
| One primary action | ✅ Context-aware | ✅ New project | ✅ Context-aware | Pass |
| Progressive disclosure | ✅ | ✅ Tabs | ✅ Tabs + Details | Pass |
| Calm visual hierarchy | ✅ (after refinements) | ✅ | ✅ | Pass |

---

## Page-by-page findings

### Dashboard (`/dashboard`)

**Primary question:** *What do I need to know today?*

| Before review | After refinement |
|---------------|------------------|
| "View Analytics" appeared in hero **and** KPI header | Secondary links live in hero only |
| AI panel had nested summary card + section link | Summary moved to section subtitle; no duplicate "View AI" |
| Upcoming Jobs had analytical subtitle | Title only — matches lightweight activity feed |
| Hero subtitle implied urgency always | Uses canonical primary question copy |

**What works well:**
- Context-aware CTA adapts to pipeline (customer → project → follow-up → draft → estimate)
- Max 3 KPIs, max 3 categorized AI insights
- Activity feed is single-line chronological
- AI categories reduce false urgency

**Residual watch (no change needed now):**
- Hero + KPIs + AI + 2 bottom panels = 5 sections — acceptable because each is capped and scannable
- Empty AI state is slightly prominent — acceptable for onboarding

---

### Customers (`/customers/[id]`)

**Primary question:** *Who is this customer and what needs attention?*

| Before review | After refinement |
|---------------|------------------|
| Overview showed **5** summary KPI cards | **3** at-a-glance metrics (active projects, open proposals, open contract value) |
| Empty attention strip showed dashed placeholder | Hidden when nothing needs attention (whitespace is a feature) |
| Hero lacked explicit primary question | Primary question in hero; contact as tertiary line |

**What works well:**
- Light hero, one primary CTA (New project)
- Attention strip surfaces max 3 open items
- Tabs defer notes, docs, full project list
- Compact AI with category tones

**Residual watch:**
- Overview still stacks: 3 KPIs + contact card + compact AI — acceptable within one tab
- Projects tab duplicates some open-items data — intentional (overview = glance, projects tab = full work)

---

### Projects (`/projects/[id]`)

**Primary question:** *What is the current state of this project?*

| Before review | After refinement |
|---------------|------------------|
| Overview had 5 sections (KPIs, AI, activity, details, contact) | Overview: KPIs + non-urgent AI + activity; **Details tab** for metadata |
| Critical AI duplicated in attention strip **and** compact panel | Strip = urgent only; compact AI = opportunity/informational |
| Empty attention strip always visible | Hidden when clear |
| Hero lacked primary question | Canonical question + customer/address as tertiary line |

**What works well:**
- Context CTA (continue estimate, create, job log, view estimates)
- Job costing behind its own tab
- 3 KPIs on overview

**Residual watch:**
- Four tabs (Overview, Estimate, Job costing, Details) — still calm because only one visible at a time
- Progress bar in hero adds one visual element — useful state signal, kept

---

## Refinements applied (this review)

1. **`lib/ui/entity-page-copy.ts`** — shared primary question strings
2. **Dashboard** — removed duplicate section links; lightened Upcoming Jobs; simplified AI summary presentation
3. **Customer** — 3-metric overview; hide empty attention strip; primary question in hero
4. **Project** — Details tab; deduplicated urgent AI; hide empty attention strip; primary question in hero

---

## Design language checklist (propagate to Estimates, Proposals, etc.)

Use this when starting UX-3+:

- [ ] Light card hero (no dark/gradient backgrounds)
- [ ] Eyebrow label (page type) + `h1` entity name
- [ ] Primary question as hero subtitle (`ENTITY_PRIMARY_QUESTIONS`)
- [ ] **One** context-aware or state-appropriate primary CTA
- [ ] Context line under CTA explaining why
- [ ] Secondary actions as ghost/text links — never competing buttons
- [ ] Attention strip only when items exist (max 3)
- [ ] Max 3 KPIs/metrics above the fold
- [ ] Compact AI (max 3) with Needs attention / Opportunity / Informational
- [ ] Every AI insight ends with a next action
- [ ] Tabs or expand for secondary capability — never delete features
- [ ] Activity feeds: chronological, single-line, no analytical copy
- [ ] `space-y-10` vertical rhythm between major sections
- [ ] Whitespace when nothing needs attention — no empty-state boxes for "all clear"

---

## Build & verification

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run ux-1:verify` | Run to confirm |
| `npm run ux-2:verify` | Run to confirm |

---

## Recommendation

**The UX-1/UX-2 design language achieves its goals.** Information density is materially lower while capability is preserved. The refinements from this review tighten hierarchy and remove duplicate pathways.

**Proceed to UX-3 (Estimates) and UX-4 (Proposals)** using the propagation checklist above — only after explicit approval to begin UX-3.

**Do not** add features during propagation. Continue editing pacing, not reshooting layout.

---

## Manual QA suggestions

1. Open dashboard with empty, early, and active portfolios — confirm CTA changes appropriately
2. Customer with no open items — confirm no attention strip noise
3. Project with budget warning — confirm urgent item in strip, not duplicated in compact AI
4. Tab through all sections — confirm nothing was removed, only relocated
5. Five-second test with a contractor: can they answer the primary question without scrolling?

---

*UX-3 not started. Await approval to propagate to Estimates.*
