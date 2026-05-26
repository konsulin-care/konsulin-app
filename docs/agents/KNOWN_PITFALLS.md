---
title: Known Pitfalls
description: Common mistakes to avoid in the Go SSR rewrite
date: 2026-05-26
---

# Go SSR Pitfalls

- Session state lost on HTMX partial renders — use cookie-based sessions
- Form state across HTMX requests requires hidden inputs or hx-vals
- Templ re-renders entire component on change — break large pages into
  small components scoped by hx-target
- `os.Getenv()` returns empty string for missing vars — validate at startup
- Chi middleware order matters — logging before auth, recover after all
- Serving frontend assets while proxy-ing API on same port confuses routes

# FHIR Pitfalls

- N+1 queries when resolving referenced resources — batch in a single
  bundle or use `_include` parameter
- Large Bundle responses overwhelm mobile memory — always paginate with
  `_count` parameter and `Bundle.link[rel=next]`
- PractitionerRole contains nested availability by location — parse
  carefully for clinic-scoped vs practitioner-scoped scheduling
- Missing `_summary` parameter returns full resources — use `_summary=count`
  for list endpoints when only metadata needed

# Offline/PWA Pitfalls

- Service worker cache invalidation — version SW files with cache busting
- IndexedDB schema versioning — use versioned stores and migration
- stale-while-revalidate strategy may show old data — use NetworkFirst
  for navigation requests
- AEHRC renderer loads terminology server URL — must be configurable
  in the React SPA env, not Go env

# AEHRC Embedding Pitfalls

- React SPA loaded on every assessment route visit — bundle cached by SW
- Cross-origin requests from React SPA to Go proxy require same-origin
  or CORS headers
- AEHRC builds form via `useBuildForm()` — ensure Questionnaire JSON
  is fully loaded before mounting the component
- Admin JS files from aehrc renderer may conflict with HTMX headers
