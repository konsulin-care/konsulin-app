---
title: Guest-Aware Auth Guard
description: OptionalAuth middleware, guest session, cookie redirect intent
date: 2026-05-27
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for current route patterns and @docs/plans/005-home-page-migration.md for the first consumer.

The Next.js anonymous session system calls `POST /api/v1/auth/anonymous-session` to create guest sessions and stores `guest_id` in localStorage. Go SSR must fully replace this using cookies:

- **Guest session cookie**: `guest_session` stores the guest ID (set by Go middleware, readable by both server and browser JS)
- **Redirect intent cookie**: `redirect_intent` preserves the intended post-login destination across magic link URL changes (set by `RequireRole`, read by frontend after login)
- **OptionalAuth middleware**: checks `auth` cookie first, then `guest_session` cookie, then creates new anonymous session via backend API
- **RequireRole enhanced**: redirects guests to `/auth` with a `redirect_intent` cookie instead of returning 403

# Goals

- `OptionalAuth` middleware: injects real session (auth cookie), guest session (guest_session cookie), or creates new anonymous session
- Guest session with GuestID in `Session` struct
- Cookie-based redirect intent: `RequireRole` sets `redirect_intent` cookie before redirecting to `/auth`
- Frontend JS reads `redirect_intent` cookie after login instead of localStorage
- Backend guest session API is called at most once per guest (cached in cookie)

# Implementation Steps

- [ ] Add `GuestSessionCookieName` and `RedirectIntentCookieName` to config (defaults: `guest_session`, `redirect_intent`)
- [ ] Add `GuestID string` field to `Session` in `internal/session/session.go` (tag `json:"-"`)
- [ ] Create `internal/middleware/optional_auth.go`:
  - Check `auth` cookie -> real session (priority)
  - Check `guest_session` cookie -> guest session with GuestID
  - If neither: POST `/api/v1/auth/anonymous-session`, parse JWT for guest_id, set `guest_session` cookie, inject guest session
  - Never redirects (soft auth)
- [ ] Enhance `RequireRole` in `internal/middleware/auth.go`:
  - If role is `"Guest"`: set `redirect_intent` cookie with current path, redirect to `/auth`
  - If role is not `"Guest"` and not in allowed list: return 403 as before
- [ ] In Go SSR base layout: inject `guest_id` as `<meta name="konsulin-guest-id" content="...">` for React SPA consumption
- [ ] Wire `OptionalAuth` globally in `cmd/konsulin-app/main.go`
- [ ] Restructure route groups: guest-allowed routes (no `RequireRole`), protected routes (with `RequireRole`)
- [ ] Write `internal/middleware/optional_auth_test.go`
- [ ] Run full test suite

# Cookie-Based Redirect Intent Flow

```
1. Guest requests /profile (protected route)
2. RequireRole: role=Guest, not in allowed list
3. Set-Cookie: redirect_intent=/profile; Path=/; MaxAge=300
4. HTTP 302 -> /auth (no query param)

5. Browser loads /auth
6. User enters email -> receives magic link
7. User clicks magic link -> /auth/verify?token=abc (URL changed)
   -> redirect_intent cookie persists across URL changes
8. SuperTokens fires onHandleEvent('SUCCESS')
9. Frontend JS reads document.cookie -> redirect_intent=/profile
10. globalThis.location.href = '/profile'
11. Clear redirect_intent cookie
```

# Reference

@src/services/anonymous-session.ts:

- `ensureAnonymousSession()` POSTs to `/api/v1/auth/anonymous-session`, decodes JWT for guest_id
- Replace: Go middleware does the same POST + JWT decode, stores result in `guest_session` cookie

@src/services/api/assessment.tsx (useSubmitQuestionnaire):

- Guest assessment: calls `ensureAnonymousSession()`, attaches FHIR Identifier `{system: "guestid", value: guest_id}`
- Adapt: React SPA reads guest_id from `<meta name="konsulin-guest-id">` instead of localStorage

@src/utils/intent-storage.ts:

- `saveIntent()`, `getIntent()` — localStorage-based intent system with 6-hour TTL
- Replace: redirect intent moves to short-lived cookie set by Go middleware

@src/config/frontendConfig.ts (onHandleEvent: SUCCESS):

- Currently reads `extractSafeRedirectPath(globalThis.location.search)` for post-login redirect
- Adapt: read `redirect_intent` cookie for the redirect target instead

@src/middleware.ts:

- Edge middleware redirects unauthenticated to `/auth?redirectToPath=...`
- Go equivalent: `RequireRole` sets `redirect_intent` cookie + redirects to `/auth`

# Risks

| Risk                                                   | Likelihood | Impact | Mitigation                                                          |
| ------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------- |
| Backend API call on every guest page load              | Medium     | Medium | Cache in `guest_session` cookie; only call API if cookie missing    |
| Guest session API unavailable                          | Low        | High   | Fall back to guest session without GuestID; log error               |
| Stale `redirect_intent` cookie redirects to wrong page | Low        | Low    | 5-minute max age; handler validates path via `ValidateRedirectPath` |
| React SPA cannot read `guest_session` cookie           | Low        | Medium | httpOnly=false on guest_session cookie; also inject via meta tag    |

# UAT

1. No cookies -> hit `/` -> `OptionalAuth` creates anonymous session -> sets `guest_session` cookie -> renders guest content
2. Valid auth cookie -> hit `/` -> `OptionalAuth` injects real session -> renders patient/practitioner content
3. No auth cookie -> hit `/profile` -> `RequireRole` sets `redirect_intent=/profile` -> redirects to `/auth`
4. After login -> frontend reads `redirect_intent` cookie -> redirects to `/profile`
5. Guest submits assessment -> React SPA reads guest_id from meta tag or cookie -> attaches FHIR Identifier
6. After registration -> claim flow works without changes
