---
title: Agentic Documentation web
description: Frontend assets — templ components, static files, assessment React SPA
---

## Relevant ADRs

| ADR | Rationale                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------- |
| 001 | Go SSR with templ + HTMX + Alpine.js for all pages except assessment SPA                             |
| 010 | Assessment page is the only React SPA route; all other pages minimal JS                              |
| 013 | Three Islands (partially superseded by 014) — plain JS for FHIR ops, Alpine for interactivity, React |
| 014 | SSR upcoming session — FHIR data moved to Go SSR, fhir-client.js removed                             |

## Rules

- All pages are Go SSR + HTMX, supplemented by client-side islands:
  - Alpine.js for lightweight interactivity (expand/collapse, toggles)
  - React only on `/assessment/*` SPA and Next.js pages (auth, AEHRC)
- No JS frameworks on Go SSR pages beyond Alpine.js (plain JS modules are allowed)
- JS modules live in `web/static/js/` and are served at `/static/js/*`
- Tailwind content config must scan `*.go`, `*.templ`, and `*.js` files
- Static assets served under `/static/` prefix; never serve from `/` root
- templ components are organized by role: `layout/`, `pages/`, `partials/`, `components/`
- Keep template logic minimal — prepare all data in Go handlers
