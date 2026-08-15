# Continuous Improvement — Learning Loop

**Status:** Complete — awaiting review

---

## Objective

Every completed project improves future estimating, pricing, and decision-making.

```
Completed Job → Job Costing → Analytics → Lessons Learned → Future Estimate Guidance
```

---

## What was built

### Lessons Engine (`lib/lessons/`)

| File | Role |
|------|------|
| `types.ts` | `EstimatingLesson`, `CompletedJobRecord`, `EstimateGuidance` |
| `queries.ts` | Loads completed jobs with estimate vs. actual data |
| `lessons-engine.ts` | Analyzes history, produces practical guidance |

**Rules (never invent confidence):**
- Minimum 2 comparable jobs for a pattern; 3 for "consistently" language
- All lessons cite sample size in `evidence`
- Insufficient data → plain message, no generic advice

**Lesson types from real data:**
- Labor underestimate by project type
- Material waste / overrun patterns
- Field hours vs. labor estimate (extra technician signal)
- Change order frequency by project type
- Margin erosion on multi-CO jobs
- Customer profitability vs. portfolio
- Scope patterns (underground/service, electrical room) from project names

### Estimate integration

- **`EstimateLessonsCompact`** — "From your completed jobs" panel on estimate workspace
- Loaded server-side on estimate page via `getEstimateGuidance()`
- Max 3 lessons shown; informational only (no auto-apply)
- Placed above Quick checks — quiet, not interrupting

---

## AI behavior

- **No generic advice** — every lesson requires historical job costing data
- **No invented confidence** — sample sizes shown; empty state when data insufficient
- **Estimator in control** — guidance is informational, not prescriptive

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Existing workflow preserved | ✓ |
| Product Standard v1 (compact panel, max 3, progressive) | ✓ |
| Lessons on estimate page | ✓ |

---

## Manual QA

1. **No completed jobs** — estimate shows dashed message about needing job costing history
2. **One completed job** — message asks for one more project with actuals
3. **2+ jobs, same type with labor overruns** — labor lesson appears with sample count
4. **Customer with margin history** — customer-specific lesson when 2+ jobs differ from portfolio
5. **Underground project name** — underground materials lesson when matching history exists
6. **Lessons are informational** — no apply buttons; estimator edits estimate manually
7. **Quick checks still work** — rule-based review panel unchanged below lessons

---

## Not in scope

- Auto-adjusting estimate line items from lessons
- OpenAI-generated lessons (rules-only from contractor data)
- Feeding lessons into copilot panel (future enhancement)

---

*Awaiting review.*
