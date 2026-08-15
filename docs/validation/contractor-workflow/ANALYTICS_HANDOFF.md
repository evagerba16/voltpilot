# Job Costing → Analytics Handoff

**Status:** Complete — awaiting review  
**Closes the contractor workflow loop**

---

## Objective

Answer:
- **How did this job perform?**
- **What should the contractor learn before bidding the next project?**

---

## Trigger

Job is ready for performance review when actuals exist **and** any of:
- Budget used ≥ 50%
- Progress ≥ 80%
- Field hours ≥ 50% of estimated labor

(`lib/projects/job-costing-primary-action.ts`)

---

## Changes

### Job costing tab

- **`JobPerformanceHandoff`** banner when ready — variance, margin, lessons for next bid
- Compact AI alerts replaced by handoff (no competing guidance)
- Job costing panel remains below for reference

### Primary CTA (tab-aware)

| State | CTA |
|-------|-----|
| Awarded, no actuals | Start Job Costing |
| Actuals in progress | Update job costs (scrolls to panel) |
| Ready for review | Review job performance → `/analytics?project=…&section=estimating` |

Overview tab also switches to **Review job performance** when job is ready.

### Lessons engine

`lib/projects/job-performance-lessons.ts` — up to 3 rule-based lessons from:
- Cost variance (over/under)
- Labor/materials category overruns
- Field hours vs. estimate
- Thin margin
- Pending change orders

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Analytics URL includes project + estimating section | ✓ |
| Single primary CTA in header | ✓ |
| Product Standard v1 (context, one CTA, progressive disclosure) | ✓ |

---

## Manual QA

1. Awarded project with **no actuals** — primary CTA **Start Job Costing**
2. Enter actuals (≥50% budget used) — handoff banner appears on job costing tab
3. Lessons list shows relevant takeaways
4. Primary CTA **Review job performance** opens analytics filtered to project
5. Analytics estimating section shows cost variance for this project

---

## Full workflow (now complete)

```
Customer → Project → Estimate → Proposal → Accept → Job Costing → Analytics
```

The loop closes: analytics lessons inform the next estimate.

---

## Not in scope

- Auto-feeding analytics lessons into future estimate AI (future enhancement)
- Dedicated "Complete job" status (uses actuals signals today)

---

*Awaiting review.*
