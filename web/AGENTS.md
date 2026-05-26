---
title: Agentic Documentation web
description: Frontend assets — templ components, static files, assessment React SPA
---

## Relevant ADRs

| ADR | Rationale                                                                |
| --- | ------------------------------------------------------------------------ |
| 001 | Go SSR with templ + HTMX + Alpine.js for all pages except assessment SPA |
| 010 | Assessment page is the only React SPA route; all other pages ~0 KB JS    |

## Rules

- All pages are pure Go SSR + HTMX except `/assessment/*` which serves the React SPA
- No React outside `web/assessment-spa/`; no JS frameworks on Go SSR pages
- Tailwind content config must scan `*.go` and `*.templ` files (not JS files)
- Static assets served under `/static/` prefix; never serve from `/` root
- templ components are organized by role: `layout/`, `pages/`, `partials/`, `components/`
- Keep template logic minimal — prepare all data in Go handlers
