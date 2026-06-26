---
title: Anonymous Session Consolidation
description: Replace dual guest_session and anon_session cookies with single anon_session JWT cookie; middleware becomes passive reader
status: accepted
date: 2026-06-10
---

# Context

The Go BFF had two parallel paths for anonymous sessions:

- The `OptionalAuth` middleware (Tier 3) called `FetchAnonymousSession()` on every cookieless request, cached the result in an IP-based in-memory cache, and set a `guest_session` cookie (URL-escaped JSON, HttpOnly=false).
- The Next.js client called `POST /api/v1/auth/anonymous-session` (proxied to the backend API) which independently created another session and set an `anon_session` cookie (raw JWT, HttpOnly).

Both cookies carried the same data (guest_id + JWT token). The dual design caused:

- Redundant backend calls — the middleware and the client each called the same endpoint, potentially creating two different guest sessions.
- Cookie confusion — two cookies for the same purpose with different formats (JSON vs JWT).
- Unnecessary IP-based cache for the middleware's redundant fetching.

# Decision

The middleware becomes a **passive reader** of the `anon_session` cookie.

- The middleware no longer calls the backend to create sessions or set cookies.
- It reads the `anon_session` cookie (raw JWT) from incoming requests, decodes the `guest_id` from the JWT payload, and injects the session into the request context.
- If neither auth nor `anon_session` cookie exists, it injects `{Role: "Guest"}` with an empty GuestID — a graceful no-op.
- The client continues calling `POST /api/v1/auth/anonymous-session` (proxied to the backend). The backend creates the session and sets the `anon_session` cookie via the proxy's `Set-Cookie` passthrough.

The `guest_session` cookie and all associated code (IP cache, `FetchAnonymousSession` call, `setGuestSessionCookie`) are removed.

## Config changes

| Old field                | New field               | Env var                                              |
| ------------------------ | ----------------------- | ---------------------------------------------------- |
| `GuestSessionCookieName` | `AnonSessionCookieName` | `ANON_SESSION_COOKIE_NAME` (default: `anon_session`) |

# Impact

Positive:

- Single cookie (`anon_session`) in JWT format — one source of truth.
- No redundant backend calls from middleware — the client call is the only session creation trigger.
- Simpler middleware — `optional_auth.go` shrinks from 209 lines to ~70.
- Security improvement — `anon_session` is HttpOnly (set by backend), unlike the old `guest_session` which was HttpOnly=false.
- IP-based in-memory cache removed — no stale cache entries, no cache sync complexity.

Negative:

- The first request of a new user has no GuestID in the session context (the middleware injects empty GuestID). The client later calls `ensureAnonymousSession()` which triggers the backend call and sets the cookie. On the next request, the middleware picks up the cookie.
- The `FetchAnonymousSession` function and `AnonymousSessionResult` type remain in `internal/client/` — still used by tests and available for future use, but the middleware no longer calls them.

Neutral:

- Client-side `ensureAnonymousSession()` code path unchanged — same URL, same response shape.
- The `force_new` parameter is still passed through to the backend (unchanged behavior).
