# Workflow Validation — Customer → Proposal

**Date:** 2026-08-05  
**Result:** PASS with one handoff gap (addressed in this release)

---

## Chain validated

| Step | Primary CTA | Advances? | Notes |
|------|-------------|-----------|-------|
| Customer | New project | ✅ | `/projects/new?customer=` |
| Project (no estimate) | Create estimate | ✅ | Opens estimate tab |
| Project (draft estimate) | Continue estimate | ✅ | `/estimates/[id]` |
| Estimate (draft) | Review with AI / Copilot | ✅ | Inline panel — no page leave |
| Estimate (final) | Add proposal | ✅ | Creates/opens proposal |
| Proposal (draft, ready) | Send to customer | ✅ | Send dialog |
| Proposal (draft, not ready) | Preview proposal | ✅ | Prepares to send |
| Proposal (sent/viewed) | Follow up | ✅ | Send dialog |
| Proposal (accepted) | View project | ⚠️ → **Start job costing** | Gap fixed |
| Project (awarded) | Add job log | ⚠️ → **Start job costing** | Label clarified |

---

## Product Standard v1

| Module | Context header | Primary CTA | Max 3 AI | Progressive disclosure |
|--------|----------------|-------------|----------|------------------------|
| Customer | ✅ | ✅ | ✅ | ✅ |
| Project | ✅ | ✅ | ✅ | ✅ |
| Estimate | ✅ | ✅ | ✅ | ✅ |
| Proposal | ✅ | ✅ | ✅ | ✅ |

---

## Embedded AI

All modules use slide-over / inline panels — no navigation to `/ai` for entity work.

---

## Dead ends

None identified in the core chain. Accepted proposal previously felt like a dead end (view-only proposal page); handoff banner + job costing CTA added.

---

*Proceeding to Proposal Acceptance → Active Job Handoff implementation.*
