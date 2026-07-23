# VoltPilot Production Launch Checklist

Last verified: 2026-07-23 against `https://voltpilot-vert.vercel.app` and local `.env.local`.

Status key: **Complete** | **Needs Attention** | **Blocked**

## Launch blockers (paying customer path)

| Item | Status | Evidence |
|------|--------|----------|
| Stripe checkout (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`) | **Blocked** | Production `/subscribe` shows "Billing unavailable" |
| Stripe webhook (`STRIPE_WEBHOOK_SECRET` + endpoint) | **Blocked** | `POST /api/stripe/webhook` returns 503 "not configured" |
| Post-checkout provisioning (`SUPABASE_SERVICE_ROLE_KEY`) | **Needs Attention** | Required for webhook; not exposed in public health before deploy |
| Welcome email after checkout (`RESEND_API_KEY`) | **Complete** (prod) | Production `/api/health` reports `resend: true` |
| Password setup redirect URLs | **Complete** | Code uses `/auth/callback?next=/reset-password` |
| `NEXT_PUBLIC_SITE_URL` on Vercel | **Needs Attention** | Must be production URL (not localhost) for auth/billing links |

## Environment variables

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Complete** | Required; prod health OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Complete** | Required; prod health OK |
| `NEXT_PUBLIC_SITE_URL` | **Needs Attention** | Set to `https://voltpilot-vert.vercel.app` on Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | **Needs Attention** | Required for subscribe webhook provisioning |
| `STRIPE_SECRET_KEY` | **Blocked** | Missing on production (verified) |
| `STRIPE_WEBHOOK_SECRET` | **Blocked** | Missing on production (verified) |
| `STRIPE_PRICE_ID` | **Blocked** | Missing on production (verified) |
| `RESEND_API_KEY` | **Complete** (prod) | Configured on Vercel |
| `RESEND_FROM_EMAIL` | **Needs Attention** | Use verified domain in production |
| `OPENAI_API_KEY` | **Complete** (prod) | Optional; configured for AI features |

## Supabase authentication

| Item | Status | Notes |
|------|--------|-------|
| Login / logout / password reset routes | **Complete** | Routes exist and respond |
| Auth callback (`/auth/callback`) | **Complete** | Redirects unauthenticated to login |
| Terminal sign-out for inactive users | **Complete** | `/auth/terminal` clears session |
| Supabase redirect allowlist | **Needs Attention** | Add `https://voltpilot-vert.vercel.app/auth/callback` |
| Email confirmation settings | **Needs Attention** | Confirm in Supabase dashboard |

## Application flows (subscribed user)

| Flow | Status | Notes |
|------|--------|-------|
| Subscribe → pay → account created | **Blocked** | Stripe not configured on production |
| Sign in → dashboard | **Complete** | Middleware + layout gating |
| Create customer / project / estimate | **Complete** | Core CRUD + RLS |
| AI estimate review | **Complete** (prod) | OpenAI configured |
| Create & send proposal | **Complete** | Requires Resend for email |
| Customer portal accept/decline | **Complete** | Draft proposals blocked from response |
| Analytics & exports | **Complete** | Permission-gated API routes |
| Billing portal | **Blocked** | Depends on Stripe env vars |

## SEO & public assets

| Item | Status | Notes |
|------|--------|-------|
| Root metadata (title, description) | **Complete** | `app/layout.tsx` |
| Open Graph / Twitter metadata | **Complete** | Added with `metadataBase` |
| `robots.txt` | **Complete** | `app/robots.ts` |
| `sitemap.xml` | **Complete** | `app/sitemap.ts` |
| Favicon | **Complete** | `app/favicon.ico`; prod returns 200 |
| Privacy / Terms pages | **Needs Attention** | Footer links currently point to `#` |

## Operations & security

| Item | Status | Notes |
|------|--------|-------|
| Production build | **Complete** | `npm run build` passes |
| Lint | **Complete** | `npm run lint` passes |
| Health endpoint | **Complete** | `/api/health` reports billing readiness |
| Error monitoring (Sentry, etc.) | **Needs Attention** | Not integrated |
| Custom security headers | **Needs Attention** | Relying on Vercel defaults (HSTS present) |
| Distributed rate limiting | **Needs Attention** | In-memory only; not production-safe at scale |
| Database migrations 001–018 | **Needs Attention** | Run `npm run db:verify-all` against prod Supabase |

## Pre-launch actions (ops)

1. Add Stripe vars to Vercel production and create webhook → `https://voltpilot-vert.vercel.app/api/stripe/webhook`
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` on Vercel
3. Set `NEXT_PUBLIC_SITE_URL=https://voltpilot-vert.vercel.app`
4. Add Supabase auth redirect URLs for production domain
5. Verify Resend sending domain (not `resend.dev` sandbox)
6. Run end-to-end test: subscribe → email → set password → create estimate → send proposal
