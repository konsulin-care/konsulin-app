---
title: Agentic Documentation web/assessment-spa
description: React SPA for AEHRC Smart Forms — single SPA route in Go SSR application
---

## Relevant ADRs

| ADR | Rationale                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------- |
| 001 | Only non-SSR page; served at `/assessment/*`; all other pages are Go SSR + HTMX                          |
| 010 | Dedicated React SPA route for AEHRC Smart Forms; service worker for offline; IndexedDB for local storage |

## Rules

- AEHRC Smart Forms renderer (`@aehrc/smart-forms-renderer`) is the only React component; bundle target ~200 KB
- Service worker: use NetworkFirst for navigation requests to avoid stale data
- Terminology server URL must be configurable in the React SPA env (not Go env vars)
- Cross-origin requests from SPA to Go proxy require same-origin or CORS headers
- Ensure Questionnaire JSON is fully loaded before calling `useBuildForm()` to mount the AEHRC renderer
- Scope HTMX to non-SPA routes to avoid header conflicts with AEHRC admin JS files
- Service worker cache busting: version SW files in build step
- IndexedDB: versioned stores with migration functions for schema changes
- Build output goes to `web/static/` for serving; the SPA is a single `<div id="aehrc-root">` mount in the Go SSR shell page
