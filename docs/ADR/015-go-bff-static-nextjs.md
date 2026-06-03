---
title: Go BFF with Next.js Static Export
description: Go server becomes pure BFF — auth, proxy, static files — all pages rendered by Next.js
status: accepted
date: 2026-06-03
supersedes:
  - ADR-001
  - ADR-014
---

# Context

The Go SSR + templ + HTMX architecture introduced timezone-sensitive
data rendering on the server. Server local time was used to determine
upcoming sessions, causing inconsistencies between what Go SSR showed
on the home page and what React showed on profile pages. The `now`
module-level constant in the React codebase compounded this with frozen
timestamps.

Two rendering stacks (Go SSR + React SPA) required duplicate FHIR
parsing logic — `fhir_provider.go` on the server and
`parseMergedAppointments` in React. Changes to FHIR response handling
required coordinated deploys on both sides.

Routes with `AuthGuard` middleware already proxy to Next.js. Only the
home page (`GET /`) and auth page (`GET /auth`) were served as Go SSR
templates. Moving these to Next.js eliminates the second stack entirely.

# Decision

The Go server strips all page rendering. It becomes a pure BFF
(Backend for Frontend) with three responsibilities:

- `/proxy/*` — transparent proxy to FHIR backend, injects
  `sAccessToken` cookie as `Authorization: Bearer` header. Passes
  raw FHIR Bundle through unchanged.
- `/auth/*` — cookie management (read/write local auth cookie
  after SuperTokens login).
- `/*` — serve Next.js static export files (`out/` directory).
  Includes `GET /`, `/profile`, `/record`, etc.

All pages are rendered by Next.js as a React SPA. Dynamic route
segments (`/record/[id]`, `/assessments/[id]`, etc.) use query
parameters instead of path segments (`/record?id=xyz`).

FHIR timestamps pass through the proxy as-is in ISO 8601 format.
The client formats them via `Intl.DateTimeFormat`. No server-side
timezone logic.

## What Stays

| Component                 | Status                                            |
| ------------------------- | ------------------------------------------------- |
| `/proxy/*` handler        | Unchanged — transparent proxy with auth injection |
| `/auth/*` cookie handlers | Unchanged — cookie read/write                     |
| `/api/config`             | Unchanged — runtime config JSON                   |
| `/static/*`               | Unchanged — Go dev static files                   |
| SuperTokens auth flow     | Unchanged — client-side SDK → proxy → backend     |

## What Goes

| Component                           | Reason                          |
| ----------------------------------- | ------------------------------- |
| `internal/handler/home.go`          | Go SSR home page handler        |
| `internal/service/home.go`          | Home data aggregation service   |
| `internal/service/fhir_provider.go` | Server-side FHIR bundle parsing |
| `web/template/pages/home/`          | templ page templates            |
| `web/template/layout/`              | templ layout templates          |
| Alpine.js on page templates         | Replaced by React components    |
| HTMX partials                       | Replaced by React data fetching |

## Dynamic Routes → Query Params

| Current Path                     | New Path             |
| -------------------------------- | -------------------- |
| `/practitioner/[practitionerId]` | `/practitioner?id=X` |
| `/clinic/[clinicId]`             | `/clinic?id=X`       |
| `/profile/[path]`                | `/profile?path=X`    |
| `/assessments/[assessmentsId]`   | `/assessments?id=X`  |
| `/exercise/[exerciseId]`         | `/exercise?id=X`     |
| `/schedule/[appointmentId]`      | `/schedule?id=X`     |
| `/record/[recordId]`             | `/record?id=X`       |

Alternatives considered: two-process container with Node.js
standalone server (adds complexity, requires Node.js in production),
Alpine.js widgets embedded in Go SSR (still two stacks, adds JS
duplication with React).

# Impact

Positive:

- Single rendering stack — every page is a React component, every
  route serves the same static `index.html` for the SPA shell.
- No duplicate FHIR parsing — React `parseMergedAppointments`
  is the single source of truth.
- Timezone-safe — ISO timestamps pass through as-is, browser
  `Intl.DateTimeFormat` renders locally.
- No Node.js in production — Next.js builds to static HTML/JS,
  Go serves files directly. Single alpine binary.
- Deployment stays the same — Coolify builds the Dockerfile,
  exposes port 3000.

Negative:

- 7 dynamic route components must be refactored from `[param]` path
  segments to `?param=` query params.
- All `<Link>` and `router.push()` calls for those routes must
  update to query-parameter format.
- Initial JS bundle includes full React app (~150 KB gzipped)
  instead of Go SSR's ~0 KB. Mitigated by code splitting and
  skeleton loading states.
- No server-side rendering for SEO. Not relevant for this app
  (authenticated-only pages).

Neutral:

- `GET /auth` page must either become a Next.js page or remain as
  a minimal Go SSR template. Auth page has no interactive data
  (login form is SuperTokens SDK), so it can stay as Go SSR or
  move to Next.js.
