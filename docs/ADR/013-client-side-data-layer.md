---
title: Client-Side Data Layer
description: Three Islands Architecture — plain JS for FHIR data, Alpine for interactivity, React for complex UIs
status: superseded
date: 2026-06-01
superseded_by: ADR-014
---

# Context

The Go SSR homepage needs to display upcoming appointments for patients
and practitioners. These require FHIR Bundle parsing (extracting
Appointments, Slots, Practitioners from `_include` responses).

Two options were considered:

1. Server-side parsing in Go (existing `GetUpcomingSession` in FHIRProvider).
2. Client-side parsing in Alpine.js (fetch via `/proxy/fhir/`, parse in browser).

Server-side parsing increases server CPU/memory per request without
benefit at our traffic scale (10k MAU, <1 req/sec peak). Alpine.js is
designed for lightweight DOM interactions (toggles, dropdowns), not
complex JSON parsing with multi-level resource indexing.

# Decision

Adopt a **Three Islands Architecture** on Go SSR pages. Each tool is
scoped to what it does best:

| Island          | Tool                                   | Responsibility                                    |
| --------------- | -------------------------------------- | ------------------------------------------------- |
| FHIR Data Layer | Plain JS (`/static/js/fhir-client.js`) | Fetch, parse Bundle, CRUD against `/proxy/fhir/*` |
| Interactivity   | Alpine.js                              | Expand/collapse, show/hide, mobile menu toggle    |
| Complex UIs     | React                                  | Auth flows (supertokens-react), AEHRC Smart Forms |

Islands run in isolation — they do not share DOM or state. This follows
the Islands Architecture pattern pioneered by Astro.

HTML templates remain Go SSR (templ + HTMX). Server-side FHIR queries
for initial page load data are replaced by client-side fetches through
the existing `/proxy/fhir/*` endpoint, which handles auth and routing.

# Impact

Positive:

- Server memory stays under 50 MB (no FHIR Bundle parsing on server).
- FHIR parsing logic is reusable across pages (same `fhir-client.js`
  module works on any Go SSR or Next.js page).
- Each tool has a clear, bounded role — no "Frankenstein of frameworks."
- Plain JS modules (~2 KB) add negligible bundle overhead.
- FHIR operations are visible in browser Network tab (dev-friendly).

Negative:

- Go SSR pages no longer have ~0 KB JS (now ~2 KB for fhir-client.js).
- Alpine.js components cannot directly call React and vice versa
  (islands are isolated by design).
- Client-side fetching means one extra round-trip after initial HTML
  render (mitigated by skeleton loading state).

Reference: Astro Islands Architecture (withastro/docs), HTMX + Alpine.js
integration guide (bigskysoftware/htmx).
