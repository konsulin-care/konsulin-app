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

# Status Notes

2026-06-01 — offline replay hardening implemented. The decision above
stands; these notes record the safety contract that now surrounds it.

- Replay is duplicate-safe: a `konsulin-replay` Web Lock (or a shared
  in-flight promise) permits one sender, and an exists probe skips a
  questionnaire response the server already stored.
- Replay is owner-scoped: pending items derive their owner from the
  payload (`Patient/`, `Practitioner/`, or `guest:`) so one user cannot
  replay or see another user's queue. Unbound guest items are sent only
  while the current identity is a guest.
- Failures are classified: network/5xx retry with backoff, 401/403 wait
  for a fresh session, other 4xx park with a reason, and 8 attempts park
  as `max-attempts`. Parked items need an explicit Retry.
- Users see waiting and parked counts in the app banner, can review and
  discard parked items, and are prompted on logout to keep or discard
  the current owner's queue.
- Local dates use `localDateOf` / date-fns `format`, never the UTC day
  from `toISOString()`.

See `@/docs/wiki/008-pwa-offline.md` for the implementation details.
