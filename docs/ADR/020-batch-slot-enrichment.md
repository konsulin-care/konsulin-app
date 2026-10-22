---
title: Batch Slot Enrichment
description: Reduce FHIR calls per recommendation load from 6 to 2 by batching Slot queries
status: accepted
date: 2026-08-19
---

# Context

Loading the patient home page fires `GET /api/recommendations`, which
triggers multiple FHIR requests. With the previous design, each
recommendation card required an individual Slot query to find the next
free appointment slot, plus the main PractitionerRole search — totaling
up to 6 FHIR calls per load. With `APP_MAX_REQUESTS=10` in production
and `staleTime: 0` on the React Query cache, navigate-back re-fetches
fire immediately and burst the rate limit, causing HTTP 429s.

# Decision

1. **Batch Slot GETs into a second FHIR batch POST.** Extract
   `BusySlotPath` (URL builder) and `ParseBusySlotsBundle` (JSON decoder)
   as pure exported functions from `availability.go`. The handler's
   `enrichWithBatch` collects all Slot paths, fires one `FetchSlotBatch`
   call, then decodes each entry via `ParseBusySlotsBundle`. This reduces
   FHIR calls from N+1 (1 role search + N slot GETs) to exactly 2
   batch POSTs regardless of specialty count.

2. **Add `staleTime: 5 minutes`** to the `useRecommendations` React
   Query hook. This eliminates redundant refetches when the user
   navigates away and back within a session.

# Impact

- FHIR call count drops from 6 to 2 per recommendation load.
- Navigate-back within 5 minutes shows cached cards instantly.
- `enrich()` (sequential slot GETs) is removed; replaced by
  `enrichWithBatch()` (single batch POST).
- The axios retry strategy (`@docs/ADR/019-rate-limit-retry.md`) is
  unchanged.
- `computeNextSlot` signature is unchanged; existing slot computation
  logic is untouched.
