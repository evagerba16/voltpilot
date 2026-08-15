# Production Operations Checklist

**Goal:** Production Operations **GREEN** for closed beta  
**Verify:** `npm run prod:verify`  
**Last updated:** 2026-08-05

Status: **🔴 NOT GREEN** — ops configuration required on Vercel/Stripe/Supabase/Resend

---

## 1. Stripe production configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | `STRIPE_SECRET_KEY` on Vercel (live or test for beta) | ⬜ Manual | Dashboard → Developers → API keys |
| 1.2 | `STRIPE_PRICE_ID` matches active subscription price | ⬜ Manual | Products → copy Price ID |
| 1.3 | Webhook endpoint `https://<domain>/api/stripe/webhook` | ⬜ Manual | Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| 1.4 | `STRIPE_WEBHOOK_SECRET` on Vercel | ⬜ Manual | From webhook signing secret |
| 1.5 | Webhook idempotency (code) | ✅ Done | Skips duplicate `checkout.session.completed` |
| 1.6 | Welcome email decoupled from webhook 500 (code) | ✅ Done | Logs warning; provisioning succeeds |

---

## 2. Production environment validation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | `.env.example` committed | ✅ Done | Copy to Vercel env |
| 2.2 | `NEXT_PUBLIC_SUPABASE_URL` + anon key | ⬜ Verify | Required |
| 2.3 | `NEXT_PUBLIC_SITE_URL` = production domain | ⬜ Manual | Not localhost |
| 2.4 | `SUPABASE_SERVICE_ROLE_KEY` | ⬜ Manual | Required for webhook provisioning |
| 2.5 | `npm run prod:verify` passes | ⬜ Run after env set | Exits 0 = GREEN |
| 2.6 | `/api/health` returns `status: ok` | ⬜ Run after env set | |

---

## 3. Supabase production auth & redirects

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Redirect allowlist: `https://<domain>/auth/callback` | ⬜ Manual | Supabase Dashboard → Auth → URL Configuration |
| 3.2 | Site URL in Supabase matches production | ⬜ Manual | |
| 3.3 | Password recovery redirect works | ⬜ Manual E2E | `/auth/callback?next=/reset-password` |
| 3.4 | Email confirmation policy reviewed | ⬜ Manual | Dashboard setting |

---

## 4. Resend verified sending domain

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Domain verified in Resend | ⬜ Manual | DNS records |
| 4.2 | `RESEND_FROM_EMAIL` set to verified address | ⬜ Manual | Not `onboarding@resend.dev` |
| 4.3 | `RESEND_API_KEY` on Vercel | ⬜ Manual | |
| 4.4 | Test welcome + proposal send | ⬜ Manual E2E | |

---

## 5. End-to-end: subscribe → dashboard

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | `/subscribe` loads checkout (not "Billing unavailable") | ⬜ Manual | |
| 5.2 | Complete test payment | ⬜ Manual | Stripe test card |
| 5.3 | Webhook provisions user + org | ⬜ Manual | Check Supabase auth + org |
| 5.4 | Welcome email received | ⬜ Manual | Or manual password link from logs |
| 5.5 | Set password → login → dashboard | ⬜ Manual | |
| 5.6 | Create customer → project → estimate | ⬜ Manual | Core workflow |

---

## 6. Reliability (code complete — configure Sentry)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Sentry SDK installed | ✅ Done | `@sentry/nextjs` |
| 6.2 | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ⬜ Manual | Create Sentry project |
| 6.3 | Global error boundary | ✅ Done | `app/global-error.tsx` |
| 6.4 | Root error boundary | ✅ Done | `app/error.tsx` |
| 6.5 | Structured logging | ✅ Done | `lib/observability/logger.ts` |
| 6.6 | Security headers | ✅ Done | `next.config.ts` |
| 6.7 | Health monitoring enhanced | ✅ Done | `/api/health` |

---

## 7. Legal (code complete)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Privacy Policy page | ✅ Done | `/privacy` |
| 7.2 | Terms of Service page | ✅ Done | `/terms` |
| 7.3 | Footer links updated | ✅ Done | |

---

## 8. Sprint 2A (when test account available)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Set `BETA_TEST_EMAIL` / `BETA_TEST_PASSWORD` | ⬜ Blocked | |
| 8.2 | Run `npm run copilot:verify-sprint2a:preflight` | ⬜ Pending | |
| 8.3 | Run `npm run copilot:verify-sprint2a` | ⬜ Pending | |
| 8.4 | Update GO-NO-GO to GO | ⬜ Pending | |

---

## Ops runbook (manual steps)

### Stripe webhook setup
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://YOUR_DOMAIN/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel
5. Redeploy

### Supabase auth
1. Authentication → URL Configuration
2. Site URL: `https://YOUR_DOMAIN`
3. Redirect URLs: `https://YOUR_DOMAIN/auth/callback`

### Resend
1. Add and verify domain
2. Set `RESEND_FROM_EMAIL=VoltPilot <notifications@yourdomain.com>`

### Verify green
```bash
PROD_VERIFY_BASE_URL=https://YOUR_DOMAIN npm run prod:verify
```

---

## Definition of GREEN

`npm run prod:verify` exits **0** with:
- All production env vars set locally or probed on production URL
- Build + lint pass
- `/api/health` returns `status: ok` on production
- Stripe webhook returns 400 (not 503) on unsigned POST
- Legal pages load

**Stopped for approval.** Code-side hardening complete; manual ops steps remain.
