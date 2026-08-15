# Proposal Acceptance → Active Job Handoff

**Status:** Complete — awaiting review  
**Scope:** Acceptance UX + forward CTAs (backend project sync already existed)

---

## Problem

When a customer accepted via portal, the project status updated to **Awarded** (DB RPC), but the contractor landed on a read-only proposal page with **View project** — not clearly guided into job management.

---

## Changes

### Accepted proposal workspace

- **`ProposalAcceptedHandoff`** banner — answers *What just happened?* and *What next?*
- Primary CTA → **Start job costing** (`/projects/[id]?tab=job-costing`)
- Quick checks hidden on accepted proposals (no stale send guidance)
- Preview remains available for reference

### Awarded project

- Primary CTA relabeled **Start job costing** with direct link to job costing tab

### Email notification (accepted)

- CTA: **Start job costing** → project job costing tab (was: view proposal)

### Backend

- No change — `submit_proposal_portal_response` already sets project `Awarded`

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Portal accept → project Awarded | Existing RPC |
| Accepted proposal primary CTA | → job costing tab |
| Awarded project primary CTA | → job costing tab |

---

## Manual QA

1. Open an **Accepted** proposal — handoff banner shows customer, amount, date
2. Primary CTA **Start job costing** opens project job costing tab
3. Awarded project overview — primary CTA **Start job costing**
4. Accepted proposal — no quick-check send nudges
5. Email notification link (if configured) points to job costing

---

## Not in scope

- Manual mark-as-accepted in dashboard (portal only today)
- Analytics handoff (next stage)
- Auto-redirect away from proposal page (banner + CTA preferred per Product Standard)

---

*Awaiting review before next workflow stage.*
