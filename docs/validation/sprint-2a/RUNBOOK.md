# Sprint 2A Validation Runbook

**Current status:** Pending Validation  
**Only remaining blocker:** Real `BETA_TEST_EMAIL` / `BETA_TEST_PASSWORD` in `.env.local`

Sprint 2B must not begin until both authenticated passes complete successfully.

---

## Prerequisites

1. Migration 023 applied (`copilot_recommendations` table exists)
2. Dev dependencies installed (`npm install`)
3. Playwright Chromium installed:
   ```bash
   npx playwright install chromium
   ```
4. `.env.local` configured:
   - `BETA_TEST_EMAIL` — real dev account (must contain `@`)
   - `BETA_TEST_PASSWORD` — matching password
   - `SUPABASE_DB_URL` — recommended for estimate lookup + persistence checks
   - `NEXT_PUBLIC_ESTIMATE_COPILOT` — feature flag (reloaded at dev server start)

---

## Preflight (run anytime)

```bash
npm run copilot:verify-sprint2a:preflight
```

Checks Playwright, dev server, credential format, feature flag, and estimate access.  
Exits 0 when **only** credentials are missing (everything else ready).

For legacy preflight:

```bash
npm run copilot:verify-sprint2a:preflight -- --legacy-only
```

---

## Pass 1 — Copilot workflow (flag ON)

1. Set in `.env.local`:
   ```bash
   NEXT_PUBLIC_ESTIMATE_COPILOT=1
   ```
2. Restart dev server (required — env is loaded at startup):
   ```bash
   npm run dev:reset
   # or: kill port 3000, then npm run dev
   ```
3. Run validation:
   ```bash
   COPILOT_E2E_BASE_URL=http://localhost:3000 npm run copilot:verify-sprint2a
   ```

**Covers:** login → open estimate → Copilot panel → analyze → apply → dismiss → save → reload → persistence → console/network/performance capture.

---

## Pass 2 — Legacy regression (flag OFF)

1. Set in `.env.local`:
   ```bash
   NEXT_PUBLIC_ESTIMATE_COPILOT=0
   ```
2. Restart dev server again.
3. Run legacy pass:
   ```bash
   COPILOT_E2E_BASE_URL=http://localhost:3000 npm run copilot:verify-sprint2a:legacy
   ```

**Covers:** AI Review, AI Assistant, Estimate Builder unchanged, no Copilot API leakage.

---

## Outputs (auto-generated after each pass)

| Artifact | Path |
|----------|------|
| Combined JSON report | `sprint-2a-validation-report.json` |
| Validation markdown | `docs/validation/sprint-2a/REPORT.md` |
| Go/No-Go report | `docs/validation/sprint-2a/GO-NO-GO.md` |
| Copilot pass results | `docs/validation/sprint-2a/artifacts/copilot-report.json` |
| Legacy pass results | `docs/validation/sprint-2a/artifacts/legacy-report.json` |
| Console logs | `docs/validation/sprint-2a/artifacts/*-console.json` |
| Network traces | `docs/validation/sprint-2a/artifacts/*-network.json` |
| Performance | `docs/validation/sprint-2a/artifacts/*-performance.json` |
| Screenshots | `docs/validation/sprint-2a/0*.png` |

---

## Status transitions

| Condition | Status | Sprint 2B |
|-----------|--------|-----------|
| Placeholder/missing credentials | Pending Validation | No |
| Copilot pass only | Pending Validation | No |
| Any test failure | Pending Validation | No — fix and rerun affected pass |
| Both passes, all criteria pass | **Validated** | Go (auto-recommended) |

## Completion criteria (all required for Validated)

- Every Playwright test passes (no failures on required steps)
- No browser console errors or unhandled promise rejections
- Every `/api/copilot/*` response successful (no unexpected 4xx/5xx)
- Apply and Dismiss persist after save + reload
- Legacy workflow passes with no regressions (`NEXT_PUBLIC_ESTIMATE_COPILOT=0`)
- `npm run build` and `npx tsc --noEmit` pass (after legacy pass)

Reports update automatically — no manual editing required.

---

## If a test fails

1. Stop — do not begin Sprint 2B
2. Fix only issues uncovered by validation (avoid unrelated Copilot changes)
3. Rerun the affected pass only
4. Confirm Go/No-Go report shows **Validated** before proceeding
