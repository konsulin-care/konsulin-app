---
title: SSR Upcoming Session
description: Move upcoming session fetch from Alpine.js client-side to Go SSR via proxy
status: accepted
date: 2026-06-02
---

# Context

The homepage header shows an upcoming session card for Patient and Practitioner roles. Originally fetched client-side via Alpine.js `x-init` calling `FHIRClient.fetchUpcoming()` → `/proxy/fhir/Appointment`. This caused inconsistent rendering: the Alpine.js fetch raced with session initialization and route transitions, so the header sometimes appeared empty on first login.

The initial fix moved the fetch to Go SSR using `fhir.Client` directly, but introduced a race condition: the `fhirClient` auth token was set on a shared singleton via `SetAuthToken()`, so concurrent requests could overwrite each other's credentials.

# Decision

Move the upcoming session fetch to the Go SSR handler, but call the **existing proxy endpoint** (`/proxy/fhir/Appointment`) from the server side instead of using `fhir.Client` directly. Each request injects its own `sAccessToken` cookie value into the request context. The `FHIRProvider.GetUpcomingSession` method reads the token from context and makes an HTTP request to `http://localhost:{port}/proxy/fhir/Appointment?actor=...&slot.start=ge...&_include=...`.

This design:

- Reuses the proxy's existing per-request auth logic (reads `sAccessToken` cookie, sets `Authorization: Bearer` header).
- Eliminates the shared `fhirClient.SetAuthToken()` race condition — no global state.
- Avoids the need for a separate auth mechanism in `fhir.Client`.
- Removes the `slotTime.After(time.Now())` filter that was inconsistent with the previous client-side behavior.

# Impact

Positive:

- Per-request auth isolation — no shared state, no race condition.
- Reuses proven proxy auth logic — no duplicate auth code.
- Removed inconsistent time filter — matches previous Alpine.js behavior.
- All benefits of SSR rendering: reliable first-load, no client-side fetch race.

Negative:

- One extra HTTP hop per home page request (Go SSR → proxy → backend). Negligible latency (same machine, localhost).
- `fhir.Client` still used for `GetPopularAssessments` (questionnaire search) — two auth paths exist.
