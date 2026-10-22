---
title: BFF API Path Families
description: Standardize BFF endpoint paths into four families: proxy, api, auth, health
status: accepted
date: 2026-08-23
---

# Context

`cmd/konsulin-app/routes.go` is the single route table for every HTTP
surface. Endpoint paths grew without a documented rule: some BFF-local
routes are versioned (`/api/v1/relay/booking`), most are not
(`/api/recommendations`, `/api/provinces`), and proxied backend paths
mix with BFF-owned ones. `docs/agents/recommendation-interview.md`
even documents a non-existent `GET /api/v1/recommendations`.

The deciding question: who owns the path semantics? The backend
service at `API_URL` (not in this repo) or the BFF itself?

# Decision

Every route belongs to exactly one of four families.

1. **`/proxy/*` — backend contract, forwarded.** Path semantics are
   owned by the backend at `API_URL`. The BFF strips `/proxy` and
   forwards unchanged, injecting the Bearer token. Covers
   `/proxy/fhir/*` and `/proxy/api/v1/*`. Backend versioning passes
   through transparently; the BFF never repaths. Only exception:
   `POST /proxy/fhir/Questionnaire` intercepts an exact match for
   BFF-side authorization but keeps the backend FHIR resource path.
   Clients call via the default `getAPI()` axios instance.

2. **`/api/*` — BFF-local, unversioned by default.** Path semantics are
   owned by this repo. Examples: `/api/recommendations`,
   `/api/recommendations/specialties`, `/api/provinces`,
   `/api/regencies/{provinceId}`, `/api/media/location`,
   `/api/config`. The `/api/v1` prefix is reserved for BFF-local
   endpoints that replace a client-to-backend v1 operation — today
   only `/api/v1/relay/booking`. Sub-patterns: child collections as
   paths (`/specialties`), hierarchy as path params (`/{provinceId}`),
   filters as query params (`?specialty=`), search as `/search`.
   Clients call via `getAPI({ proxy: false })`.

3. **`/auth/*` — pre-auth session endpoints, never versioned.**
   `/auth/logout`, `/auth/cookie`, `/auth/cookie/csrf-token`,
   `/auth/role/switch`. Distinct from `/api/v1/auth/*`, which is the
   proxied SuperTokens contract.

4. **`/health` — plain liveness probe.**

New endpoints: ask who owns the semantics. Backend-owned means forward
under `/proxy/*` (or a dedicated proxy family). BFF-owned aggregation
or utility means unversioned `/api/*`. Add `/api/v1` only when the
endpoint mirrors a backend product API v1 operation.

# Impact

- Route registration stays centralized in `routes.go`; handlers never
  mount their own paths.
- Backend version bumps do not touch BFF code — proxy paths forward
  unchanged.
- BFF-local API breaks are not signaled by a version prefix; the BFF
  carries no own version namespace. A future v2 contract would add
  `/api/v2`.
- Fixes the stale `GET /api/v1/recommendations` reference in
  `docs/agents/recommendation-interview.md`. The actual endpoint is
  `/api/recommendations`.
