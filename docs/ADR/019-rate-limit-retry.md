---
title: Rate Limit Retry
description: FHIR reads use single identity-scoped queries, and 429 responses are retried with Retry-After-aware backoff.
status: accepted
date: 2026-08-14
---

# Context

The report page issued one `QuestionnaireResponse` search per questionnaire
in the study (N parallel GETs), on top of the research-progress response
search and the titles query. For a 5-questionnaire study this fired ~7 FHIR
requests within a second, tripping the server rate limiter: the tail request
returned 429, and the all-or-nothing `Promise.all` discarded every successful
response, degrading the report to stale drafts.

Options considered:

- Per-questionnaire queries in a single FHIR batch bundle, retrying failed
  entries only.
- One query per identity scope with a comma-joined server-side
  `questionnaire=` filter.
- Client-side filtering of an unfiltered identity-scoped response search.

# Decision

1. **One scoped query per identity scope.** `useReportResponses` issues a
   single `QuestionnaireResponse` search, bounded by identity (`author=`
   for patients, `identifier=` for guests), narrowed server-side with a
   comma-joined canonical `questionnaire=` filter, and bounded below by
   `authored=ge{earliest batch start}`. Results are filtered client-side to
   the requested id set as a guard. No per-questionnaire requests, no batch
   bundle.

2. **Generic 429-aware retry.** `shouldRetryRequest` treats 429 as
   retryable for idempotent GETs within the retry budget; `getRetryDelayMs`
   honors the `Retry-After` header (seconds or HTTP-date) when present,
   falling back to exponential backoff with jitter. `isRateLimited`
   distinguishes 429 from other 4xx. The axios response interceptor applies
   this to every request, so the policy is reusable without per-feature
   wiring.

3. **Structure-only progress on report.** The report page requests
   `useResearchProgress({ skipResponseSearch: true })` so the redundant
   minimal response search is not re-fetched; full responses come from the
   single scoped query instead.

# Impact

- `/report` drops from ~7 FHIR requests to 3 (studies bundle, titles, one
  response search), eliminating the burst that caused the 429.
- Transient rate limits self-heal with a server-respecting backoff instead
  of surfacing as hard failures.
- Guest offline fallback (IndexedDB drafts) is preserved for queued
  submissions.
- The `_elements=questionnaire,authored` response search remains on
  `/research` where the minimal projection keeps payloads small.
