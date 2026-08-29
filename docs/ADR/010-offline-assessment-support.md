---
title: Offline Assessment Support
description: AEHRC Smart Forms as client-side React SPA in Go SSR shell
status: accepted
date: 2026-05-26
---

# Context

AEHRC Smart Forms (`@aehrc/smart-forms-renderer`) is a React component
with hooks and context providers. It cannot render in Go SSR. Assessment
`007-aehrc-forms` confirms the renderer is already 100% client-side with
no server-side HTML rendering needed.

# Decision

Serve AEHRC on a dedicated React SPA route within the Go SSR application.
The Go server serves the shell HTML page with mount point, serves the
React bundle as static assets, and proxies API calls to the backend.
All other pages remain pure Go SSR + HTMX.

Alternatives considered: rebuild renderer in templ (prohibitive effort),
iframe embed (works but limits UX integration).

# Impact

Assessment page loads a ~200 KB React bundle. All other pages have
~0 KB JS. Offline support via service worker cache + IndexedDB.
Go SSR bridge handles API proxying for cross-origin requests.
