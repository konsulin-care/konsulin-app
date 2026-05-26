---
title: Agentic Documentation web/static/js
description: Client-side JS — Alpine.js, HTMX, service worker, no React outside assessment SPA
---

## Relevant ADRs

| ADR | Rationale                                                                      |
| --- | ------------------------------------------------------------------------------ |
| 001 | Pure HTMX and Alpine.js; ~0 KB JS on Go SSR pages                              |
| 010 | Service worker for offline assessment caching; stale-while-revalidate strategy |
| 011 | HTMX `hx-trigger` for lazy loading on scroll/revealed for PHR timeline         |

## Rules

- No AJAX calls from Alpine.js — use HTMX for all data fetching
- Alpine.js only for client-side UI state (toggles, `x-show`) — never for data fetching
- Keep `x-data` expressions under 5 lines; extract to named functions
- Service worker: version SW files with cache busting; NetworkFirst for navigation requests
- IndexedDB schema versioning — use versioned stores and migration functions
- HTMX is loaded from CDN or vendored file; avoid multiple HTMX versions
- Do not import React, ReactDOM, or any React library in this directory
