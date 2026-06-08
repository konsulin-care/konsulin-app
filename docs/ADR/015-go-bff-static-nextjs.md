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

Go SSR + templ used server local time for upcoming sessions, causing
inconsistencies with React profile pages. Two rendering stacks required
duplicate FHIR parsing (Go `fhir_provider.go` + React
`parseMergedAppointments`). Routes with `AuthGuard` already proxy to
Next.js; only `GET /` and `GET /auth` remain as Go SSR templates.

# Decision

Go becomes pure BFF with three responsibilities:

- `/proxy/*` — transparent FHIR proxy, injects `sAccessToken` as
  `Authorization: Bearer`
- `/auth/*` — cookie management (read/write after SuperTokens login)
- `/*` — serve Next.js static export (`out/` directory)

All pages render in React as SPA. Dynamic route segments use query
params instead of path segments (`/record?id=X`). FHIR timestamps pass
through as-is (ISO 8601); `Intl.DateTimeFormat` handles client-side
formatting.

## What Stays

| Component                 | Status                                            |
| ------------------------- | ------------------------------------------------- |
| `/proxy/*` handler        | Unchanged — transparent proxy with auth injection |
| `/auth/*` cookie handlers | Unchanged — cookie read/write                     |
| `/api/config`             | Unchanged — runtime config JSON                   |
| `/static/*`               | Unchanged — Go dev static files                   |
| SuperTokens auth flow     | Unchanged — client-side SDK → proxy → backend     |

## What Goes

| Component                             | Reason                          |
| ------------------------------------- | ------------------------------- |
| `@/internal/handler/home.go`          | Go SSR home page handler        |
| `@/internal/service/home.go`          | Home data aggregation service   |
| `@/internal/service/fhir_provider.go` | Server-side FHIR bundle parsing |
| `@/web/template/pages/home/`          | templ page templates            |
| `@/web/template/layout/`              | templ layout templates          |
| Alpine.js on page templates           | Replaced by React components    |
| HTMX partials                         | Replaced by React data fetching |

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

# Impact

Positive:

- Single rendering stack — every page is React, every route serves `index.html`
- No duplicate FHIR parsing — React is single source of truth
- Timezone-safe — ISO timestamps pass through as-is, browser formats locally
- No Node.js in production — single Go binary serves static files
- Deployment unchanged — Coolify builds Dockerfile, exposes port 3000

Negative:

- 7 dynamic routes refactored from `[param]` to `?param=` query params
- All `<Link>` and `router.push()` calls for those routes must update
- Initial JS bundle ~150 KB gzipped (mitigated by code splitting + skeleton loading)
- No SSR for SEO — acceptable for authenticated-only pages

Neutral:

- `GET /auth` can stay as Go SSR or move to Next.js (login form is SuperTokens SDK, no interactive data)
