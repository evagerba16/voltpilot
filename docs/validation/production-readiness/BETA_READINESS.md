# Launch Readiness

**Phase:** Launch Readiness  
**Date:** 2026-08-05  
**Status:** No new features. Dashboard frozen. Only deployment, validation, bug fixes, reliability, and beta feedback.

---

## Definition of Done

VoltPilot is ready for closed beta when **all** of the following are true:

| Condition | Status |
|-----------|--------|
| Production environment is GREEN | ⬜ |
| End-to-end workflow completes without developer intervention | ⬜ |
| No Critical launch blockers remain | ⬜ |
| Product Standard v1 remains intact | ✅ |
| Dashboard stays frozen | ✅ |
| First 5–10 contractors can use VoltPilot without dev-team onboarding | ⬜ |

**When all conditions are met → stop development → begin closed beta.**

---

## Dashboard freeze

The dashboard is **approved and frozen** for closed beta.

**Do not make dashboard changes unless:**
- A production bug is discovered
- Multiple beta users report the same usability issue
- A critical workflow problem is identified

**Do not redesign based on preference.**

Code flag: `DASHBOARD_FROZEN = true` in `lib/dashboard/constants.ts`

---

## Success criteria

The question is no longer *"Did we build it?"*

| Question | Required for beta |
|----------|-------------------|
| Can a contractor sign up without help? | Yes |
| Can they subscribe? | Yes |
| Can they complete the full workflow? | Yes |
| Would they use VoltPilot again tomorrow? | Yes |

**If yes → ship the beta.**  
**If no → fix only what blocks that outcome.**

---

## Development freeze

**Allowed before and during closed beta:**
- Production deployment
- Production validation
- Bug fixes
- Reliability improvements
- Beta feedback response (blockers only)

**Not allowed unless Critical production issue or beta blocker:**
- New product capabilities
- New AI features
- UX redesigns (including dashboard)
- Architectural changes

---

## Remaining gates (in order)

| # | Gate | Owner | Status |
|---|------|-------|--------|
| 1 | Production Operations GREEN | Ops + Engineering | ⬜ `npm run prod:verify` exit 0 |
| 2 | Production E2E workflow | QA | ⬜ Full path without developer help |
| 3 | Learning Loop verification | QA | ⬜ Lessons appear on estimate workspace from completed jobs |
| 4 | Sprint 2A validation | QA | ⬜ Blocked on `BETA_TEST_*` credentials |
| 5 | Fix issues from validations | Engineering | ⬜ As discovered |

**Mark as Accepted (manual award):** ✅ Complete

---

## Gate 1: Production Operations GREEN

```bash
PROD_VERIFY_BASE_URL=https://YOUR_DOMAIN npm run prod:verify
```

Manual ops checklist: `docs/validation/production-readiness/OPS_CHECKLIST.md`

Required:
- Stripe keys + webhook on Vercel
- `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Resend verified domain
- Sentry DSN
- Deploy latest code

---

## Gate 2: Production E2E workflow

One successful run on production **without developer intervention**:

```
1. Sign up
2. Subscribe
3. Create customer
4. Create project
5. Build estimate
6. Send proposal
7. Accept proposal (portal OR Mark as accepted)
8. Start job costing
9. Review analytics
10. Verify Learning Loop (lessons from completed job appear on next estimate)
```

Document results in `docs/validation/product-validation/friction-log.json` if friction is found.

---

## Gate 3: Learning Loop

Verify on production or staging with real completed-job data:

- Complete at least one job through job costing
- Open a new estimate on a similar project
- Confirm "From your completed jobs" guidance appears (`lib/lessons/`)

Report: `docs/validation/contractor-workflow/LEARNING_LOOP.md`

---

## Gate 4: Sprint 2A

When test account is available:

```bash
npm run copilot:verify-sprint2a:preflight
npm run copilot:verify-sprint2a
npm run copilot:verify-sprint2a:legacy
```

Update `docs/validation/sprint-2a/GO-NO-GO.md` to GO or document Copilot out-of-scope for beta v1.

---

## Beta success metrics

Measure — do not guess:

| Metric | How to capture |
|--------|----------------|
| Time to first customer | Onboarding timestamp → first customer created |
| Time to first estimate | First customer → first estimate saved |
| Time to first proposal | First estimate → first proposal sent |
| Time to first completed workflow | Signup → job costing or analytics handoff |
| Number of support requests | Support channel / session notes |
| Points of friction | `docs/validation/product-validation/friction-log.json` |
| User retention after one week | Return login within 7 days |

**Roadmap decisions come from these metrics — not internal opinions.**

---

## Closed beta plan

### Cohort
5–10 electrical contractors, desktop-first, willing to run 1–2 real bids.

### Session 1 (guided, ~60 min)
Subscribe/login → first customer → estimate → send proposal → accept → job costing

### Session 2 (async, ~1 week)
Second job independently; log friction in friction log

### Success
Contractors complete workflow without development-team onboarding.

---

## Final milestone

The goal is no longer to build VoltPilot.

The goal is to **prove that electrical contractors can successfully run part of their business with VoltPilot and want to come back the next day.**

After closed beta begins, every roadmap decision comes from real customer behavior — not internal planning.
