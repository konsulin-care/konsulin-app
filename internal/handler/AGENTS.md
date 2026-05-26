---
title: Agentic Documentation internal/handler
description: HTTP handlers — one per route group, thin delegation to service layer
---

## Relevant ADRs

| ADR | Rationale                                                                         |
| --- | --------------------------------------------------------------------------------- |
| 001 | Handlers return `templ.Component`, set HTMX response headers, keep under 20 lines |
| 002 | Handlers aggregate FHIR resources; no custom endpoint design                      |
| 003 | Handler calls recommendation service, returns shaped recommendation data          |
| 004 | Handler queries availability windows via service, passes to template              |
| 005 | Handler fetches unified practitioner calendar from FHIR Appointment bundle        |
| 006 | Handler implements recommendation-first flow — recs primary, calendar secondary   |
| 007 | Handler computes fee breakdown display via pricing service                        |
| 008 | Handler behavior branches on active role from session                             |
| 009 | Admin handler actions scoped to active clinic context                             |
| 011 | Handler returns HTMX partials for progressive PHR timeline loading                |

## Rules

- Keep handlers under 20 lines — delegate all logic to service layer
- Return HTML fragments from HTMX endpoints, never JSON
- Use `HX-Redirect` for auth redirects, not client-side navigation
- Read role and clinic from session on every HTMX request (session lost on partial renders)
- Pass CSRF token via `@ctx.Inject()` for all POST/PUT/DELETE
- Handler files: `clinic.go`, `schedule.go`, `assessment.go`, `profile.go`, `record.go`, `auth.go`
- `assessment.go` proxies to the React SPA shell; it serves HTML with `<div id="aehrc-root">` mount point
