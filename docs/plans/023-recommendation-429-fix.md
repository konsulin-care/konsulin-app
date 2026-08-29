---
title: Recommendation 429 Fix
description: Cut FHIR calls per recommendation load from 6 to 2; add staleTime to prevent redundant refetches
status: draft
date: 2026-08-16
---

# Overview

Loading the patient home page fires `GET /api/recommendations`, which triggers
6 FHIR requests (1 batch POST with up to 5 specialty searches, then 5
sequential `GET /fhir/Slot` calls). With `APP_MAX_REQUESTS=10` in production
and `staleTime: 0` on the query, navigate-back re-fetches fire immediately and
burst the rate limit, causing 429s.

Three changes together resolve this:

1. **Batch the Slot GETs** into a second FHIR batch POST — 6 FHIR calls → 2.
2. **Add `staleTime: 5min`** to `useRecommendations` — eliminates redundant
   refetches within a session.
3. **Create ADR-020** documenting the batch-enrichment decision.

The axios retry strategy (exponential backoff + `Retry-After`) is correct as-is
and is not changed.

# Goals

- Single patient home load stays within 2 FHIR requests regardless of specialty.
- Navigate-back within 5 minutes shows cached cards instantly, no refetch.
- No regression in next-slot display or existing recommendation tests.

# Implementation Steps

- [ ] **Step 1: Extract `BusySlotPath`** — In
      `internal/service/availability.go`, pull the URL-building logic out of
      `fetchBusySlots` into a pure exported function
      `BusySlotPath(scheduleID string, now time.Time) string`. Keep the existing
      `fetchBusySlots` function intact (it calls the new helper internally) so
      nothing else breaks.

- [ ] **Step 2: Add `ParseBusySlotsBundle`** — In
      `internal/service/availability.go`, add a pure exported function
      `ParseBusySlotsBundle(data json.RawMessage) ([]busySlot, error)` that decodes
      one FHIR batch entry response into busy intervals. No HTTP, no side effects.

- [ ] **Step 3: Add `enrichWithBatch`** — In
      `internal/handler/recommendations.go`, replace the sequential `enrich()` loop
      with `enrichWithBatch(r *http.Request, recs []service.Recommendation)`:
  - Collect `BusySlotPath(rec.ScheduleID, now)` for each rec that has a
    `ScheduleID`.
  - Submit one `fetchBatch` call with those URLs.
  - For each batch entry response, call `ParseBusySlotsBundle`, then
    `computeNextSlot` (already pure), and attach the result to the rec.
  - Recs with no `ScheduleID` or a failed entry get `NextSlot = nil` (same
    as before).
  - Remove the old `enrich()` function.

- [ ] **Step 4: Write Go unit tests** — In
      `internal/service/availability_test.go` (create if absent):
  - Test `BusySlotPath` returns the correct URL with proper query params.
  - Test `ParseBusySlotsBundle` with a valid bundle JSON and with malformed JSON.
  - Test `computeNextSlot` remains covered (confirm no regressions).

- [ ] **Step 5: Add `staleTime` to `useRecommendations`** — In
      `src/services/recommendations.tsx`, add `staleTime: 5 * 60 * 1000` to the
      `useQuery` call in `useRecommendations`. No other options change.

- [ ] **Step 6: Write frontend unit test** — In
      `src/services/__tests__/recommendations.test.ts` (create if absent):
  - Assert that a second render of a component using `useRecommendations` with
    the same params within 5 minutes does not fire a second network call.

- [ ] **Step 7: Create ADR-020** — Write
      `docs/ADR/020-batch-slot-enrichment.md` documenting the decision to batch
      Slot GETs into a second FHIR batch POST. Update `docs/agents/ARCHITECTURE.md`
      to reference it.

- [ ] **Step 8: Run Go tests** — `go test ./internal/service/... ./internal/handler/...` passes.

- [ ] **Step 9: Run frontend tests and lint** — `npm test` passes; `npx eslint --max-warnings 5 src/services/` passes.

# Definition of Done

| Check                                                          | How verified                                |
| -------------------------------------------------------------- | ------------------------------------------- |
| Exactly 2 FHIR batch POSTs per recommendation request          | Go test with mock HTTP client               |
| No refetch within 5 min for same params                        | Frontend test, call count                   |
| `npm test` passes                                              | CI                                          |
| `go test ./internal/service/... ./internal/handler/...` passes | CI                                          |
| ESLint clean on `src/services/`                                | `npx eslint --max-warnings 5 src/services/` |
| ADR-020 referenced in ARCHITECTURE.md                          | Manual review                               |

# Risks

| Risk                                                 | Likelihood | Impact | Mitigation                                                                  |
| ---------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Blaze batch rejects >10 entries                      | Low        | High   | Max 5 Slot entries per batch; well within typical limits                    |
| `computeNextSlot` signature change breaks call sites | Low        | Medium | Keep function signature unchanged                                           |
| 5-min stale data shows outdated practitioner cards   | Low        | Low    | Recommendations are specialty-matched, not real-time — acceptable staleness |
| `ParseBusySlotsBundle` receives non-200 batch entry  | Medium     | Low    | Return empty slice — NextSlot = nil, same as current failure behavior       |
