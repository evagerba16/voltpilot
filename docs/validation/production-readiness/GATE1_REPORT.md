# Gate 1 — Production Operations Verification Report

**Date:** 2026-08-05  
**Target:** `https://voltpilot-vert.vercel.app`  
**Status:** 🔴 **NOT GREEN** — blocked on Stripe production configuration

---

## Actions completed

| Action | Result |
|--------|--------|
| Deploy latest production build | ✅ `npx vercel deploy --prod` → aliased to `voltpilot-vert.vercel.app` |
| Fix lint blocking verify (`.vercel/**` in eslint ignore) | ✅ `npm run lint` exit 0 |
| Fix verify site-url false positive | ✅ Uses `PROD_VERIFY_BASE_URL` when set |
| Privacy / Terms on production | ✅ HTTP 200 (was 404 before deploy) |
| Configure Stripe on Vercel | ❌ **Not configured** — keys not available in repo or `.env.local` |

---

## Verification summary

Run: `BETA_VERIFY_SKIP_BUILD=1 PROD_VERIFY_BASE_URL=https://voltpilot-vert.vercel.app npm run prod:verify`

| Category | Passed | Failed | Warnings |
|----------|--------|--------|----------|
| Total | 22 | 5 | 2 |

Full machine-readable report: `OPS_VERIFY.json`

---

## Remaining failures (all Stripe-related)

| Check | Evidence | Fix |
|-------|----------|-----|
| `STRIPE_SECRET_KEY` (local verify) | missing in `.env.local` | Add to Vercel **and** `.env.local` for local verify |
| `STRIPE_WEBHOOK_SECRET` (local verify) | missing | Create webhook → copy signing secret → Vercel |
| `STRIPE_PRICE_ID` (local verify) | missing | Copy Price ID from Stripe Dashboard → Vercel |
| Stripe webhook (remote) | HTTP 503 | Same — production missing Stripe env |
| Production health `status: ok` | `stripe: false`, `stripeWebhook: false` | Same |

Production health response (2026-08-05):

```json
{
  "status": "degraded",
  "checks": {
    "env": true,
    "supabase": true,
    "siteUrl": true,
    "siteUrlNotLocalhost": true,
    "openai": true,
    "resend": true,
    "resendDomain": false,
    "stripe": false,
    "stripeWebhook": false,
    "supabaseAdmin": true,
    "sentry": false
  }
}
```

---

## Vercel production env (current)

Configured on Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

**Missing on Vercel:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

Optional (warnings only):
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- Verified `RESEND_FROM_EMAIL` domain (currently sandbox-compatible)

---

## Unblock Gate 1 — manual steps

### 1. Stripe Dashboard → Developers → API keys
Copy **Secret key** (test mode OK for closed beta).

### 2. Stripe Dashboard → Products
Copy active subscription **Price ID** → `STRIPE_PRICE_ID`

### 3. Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://voltpilot-vert.vercel.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4. Add to Vercel (Production environment)
```bash
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_PRICE_ID production
npx vercel env add STRIPE_WEBHOOK_SECRET production
npx vercel deploy --prod
```

### 5. Re-verify
```bash
PROD_VERIFY_BASE_URL=https://voltpilot-vert.vercel.app npm run prod:verify
```

Exit 0 = 🟢 GREEN → proceed to Gate 2.

---

## Warnings (non-blocking for GREEN)

- Resend sandbox from address — verify domain before beta emails
- Sentry DSN not set — recommended but not required for `prod:verify` exit 0

---

## Gate 1 verdict

**NO-GO** until Stripe env vars are configured on Vercel and `prod:verify` exits 0.

Code and deployment are ready. The remaining work is **ops configuration with Stripe credentials** that only the account owner can provide.
