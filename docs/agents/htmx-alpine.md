---
title: HTMX and Alpine.js Standards
description: Client-side interaction patterns for Go SSR pages
date: 2026-05-26
---

# HTMX Standards

- Use `hx-trigger` for lazy loading (scroll, revealed, intersect)
- Use `hx-target` for partial DOM updates, never full page reload
- Return HTML fragments from endpoints, not JSON
- Use `HX-Redirect` for auth redirects
- Configure `htmx.config.responseHandling` — treat 4xx/5xx as errors, allow 422 for validation errors
- Wire `htmx:responseError` for global error handling across requests
- Wire `htmx:sendError` for connection failure handling
- Return correct HTTP status codes from partial endpoints — 422 for validation, 404 for not found, 200 for success
- Use `HX-Retarget` to route error responses to an error toast or inline container
- CSRF token in `HX-Request` header for POST/PUT/DELETE

# Alpine.js Standards

- Use Alpine only for client-side state that cannot be server-driven
- Prefer HTMX for data fetching; Alpine for UI toggles (`x-show`)
- Register reusable component logic with `Alpine.data()` instead of inlining in `x-data`
- Use `Alpine.morph()` for HTMX partial responses that must preserve Alpine component state
- Prefer `x-model` over manual event binding for form inputs
- Keep `x-data` expressions under 5 lines; extract logic to `Alpine.data()`
- No AJAX calls from Alpine — use HTMX instead
