---
title: Intent-Aware Recommendation Selection
description: Thread serviceTypeCode into the BFF, rank by service relevance, and fill short pools to five cards
status: accepted
date: 2026-08-23
---

# Context

The screening interview resolves a chief complaint to a NUCC `specialty`
plus a `serviceTypeCode` and `icfDomain`. Only the specialty reached the
BFF. Per-practitioner dedup therefore compared `HealthcareService.type`
codes against the NUCC string — a different code system — so no service
ever matched and the cheapest service won per practitioner. A burnout
complaint could surface a medication-management card. Sparse seeds also
meant a load could return one card instead of the promised five, and
cards had no relevance ordering beyond cascade/source order.

# Decision

1. **Thread the intent end-to-end.** `buildRecommendationParams` sends
   `serviceTypeCode` and `icfDomain`; the handler parses both and
   `FetchParams` carries them.

2. **Intent-aware service selection.** `candidateMatchesIntent` matches
   `HealthcareService.type` codes against the requested `serviceTypeCode`,
   keeping the NUCC specialty code as a legacy fallback so callers
   without an intent keep prior behavior. Per-practitioner dedup prefers
   the matching service; fee breaks ties only when no service matches.

3. **Relevance-first ranking.** The handler ranks enriched cards by
   intent match, then matchSource (exact > related > fallback), then
   next slot, distance, fee, and role ID (deterministic) before
   truncating to five.

4. **Guaranteed five with a rate-safe fill.** Exact + proximity-expanded
   specialties stay inside one FHIR batch POST
   (`relatedSpecialtyLimit` 5→8, threshold 0.5→0.4; ≤ 10 batch entries
   per the documented Blaze ceiling). When that pool is short, one extra
   conditional batch POST searches any active PractitionerRole
   (`_sort=-_lastUpdated`, `_count=10`, same includes), skipping seen
   practitioners and marking additions `matchSource: fallback`.

# Impact

- First card for a burnout complaint is a burnout-care service, not
  medication management; intent-matching services always outrank
  non-matching ones.
- Worst-case FHIR budget per recommendation load is 3 batch POSTs
  (specialties + fallback + slots); a fully-populated load stays at 2.
- Batch composition must respect the Blaze entry ceiling of ten — the
  widening is bounded by that, not by the `APP_MAX_REQUESTS=10` rate
  limit, because widening adds batch entries, not HTTP requests.
- Fallback cards may be generic practitioners, ranked last. Relevance
  remains a sort preference, not a hard filter.
- Deterministic ordering for identical params (stable sort, role-ID
  tie-break).
