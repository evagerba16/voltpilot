# Acceptance Milestone Refinement

**Status:** Complete — awaiting review

---

## Change

Accepted proposals are now a **milestone experience**, not a status banner on an editing screen.

### Milestone screen answers

| Question | Answer |
|----------|--------|
| What just happened? | "You won {project}" — trophy header, contract value, acceptance details |
| What was won? | Customer, contact, type, location, amount, margin |
| What's next? | "Next phase: run the job" — job costing, field logs, change orders |
| Primary CTA | **Start Job Costing** (toolbar — single primary action) |

### Recommended next steps

Rule-based checklist from project data (`lib/proposals/acceptance-next-steps.ts`):
- Opening job costs, kickoff, daily logs
- GC coordination (when applicable)
- Inspection milestones (commercial/industrial types)
- Material buyout (material-heavy scopes)
- Margin watch (thin margins)

### UX

- Price strip hidden (value shown in milestone)
- Signed proposal collapsed under "View signed proposal"
- AI insights hidden (workflow is forward)
- No duplicate CTAs in milestone body

---

## Manual QA

1. Open **Accepted** proposal — milestone hero, not edit screen
2. Contract value, customer summary, and next phase copy visible
3. Recommended next steps checklist appears (3–5 items)
4. Primary CTA: **Start Job Costing** → job costing tab
5. "View signed proposal" expands to customer-facing preview

---

*Awaiting review.*
