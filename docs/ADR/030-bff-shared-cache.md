---
title: BFF Shared Cache
description: A 24h in-memory cache in the Go BFF for guest-readable public catalog GETs
status: accepted
date: 2026-11-24
---

# Context

Public catalog queries are repeated by every respondent: Questionnaires,
ResearchStudies, clinics, and counts. Each request travels through the BFF to
the FHIR server and loads it again, even though the data rarely changes and is
identical for every identity including Guest.

The backend will later add its own identity-based cache. Until then the BFF is
the cheapest place to absorb this repeated load. The BFF already proxies every
FHIR request, so it can serve these reads without touching the backend.

# Decision

Add a 24-hour in-memory cache in the BFF for GET requests that every role,
including Guest, may read.

**Key**

- The key is the request path plus the sorted query string.
- The key contains no identity, because the cached data is public.

**Allowlist**

Only these resource types are cached:

- Questionnaire, ResearchStudy, Organization, HealthcareService, Location,
  Media, CodeSystem, ValueSet.
- PractitionerRole, only when the query has no `practitioner` or `actor`
  parameter.
- `_summary=count` on QuestionnaireResponse and ResearchSubject, only when the
  query has no identity parameters.

**Never cached**

- Slot, Schedule, Appointment and Practitioner.
- Any request carrying identity parameters.

**Storage semantics**

- Only 200 responses are stored.
- Responses carrying `Set-Cookie` are not stored.
- Entries are capped by entry size and total size to bound memory.
- A miss uses single-flight, so concurrent requests for the same key produce
  one backend fetch.

**Invalidation**

- A write through the BFF invalidates the resource type it touched.
- A Bundle POST invalidates everything, unless every entry is a GET.
  ADR 035 narrows this: a read-only batch POST keeps the cache.

# Impact

- Repeated public catalog reads no longer hit the FHIR server, cutting load and
  latency for respondents.
- Cached responses skip the backend RBAC check. This is why the allowlist must
  stay limited to data that Guest may read; widening it would leak data.
- Edits made outside the BFF stay stale in the cache until the process
  restarts or the entry is invalidated by a BFF write.
- Multiple replicas keep independent caches, so invalidation only affects the
  replica that handled the write. Consistency across replicas waits for the
  backend cache.
- Read-only batch POSTs no longer clear the cache. See
  `@docs/ADR/035-read-only-batch-cache.md`.
