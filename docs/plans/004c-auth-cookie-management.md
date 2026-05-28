---
title: Auth Cookie Management
description: Go HTTP endpoint replaces Next.js server action for setting auth cookie
date: 2026-05-27
---

# Overview

The `auth` cookie is currently set by the Next.js server action `src/app/actions.ts:setCookies()`. After Next.js removal, a Go HTTP endpoint must replace it. This plan creates `POST /api/auth/cookie` and `DELETE /api/auth/cookie` handlers that set and clear the auth cookie server-side.

Required by plan 004d (auth pages need this to set the cookie after SuperTokens login).

# Goals

- `POST /api/auth/cookie` sets the `auth` cookie from request body (userId, role_name, fhirId, etc.)
- `DELETE /api/auth/cookie` clears the `auth` cookie
- Cookie uses `Secure`, `HttpOnly`, `SameSite=Lax` from config (same as logout handler)
- Frontend callers replace `setCookies()` server action with `POST /api/auth/cookie`
- Auth cookie restoration (`restoreAuthCookie`) uses this endpoint instead of server action

# Implementation Steps

- [ ] Create `internal/handler/auth_cookie.go`:
  - `POST /api/auth/cookie`: reads `{userId, role_name, fhirId, ...}` from body, validates fields, sets `auth` cookie with `Secure: cfg.CookieSecure`, `HttpOnly: true`, `SameSite: http.SameSiteLaxMode`
  - `DELETE /api/auth/cookie`: sets `auth` cookie with empty value and `MaxAge: -1`
  - [ ] **POST /api/auth/cookie validation**: verify SuperTokens sAccessToken cookie is present in the incoming request; reject with 401 if missing (lightweight check matching current Next.js middleware pattern)
- [ ] Replace HMAC signing with gorilla/securecookie:
  - `internal/session/session.go`: replace `signValue`/`verifySignedValue` helpers with `securecookie.New(hashKey, blockKey).Encode/Decode`
  - `internal/session/session.go`: keep `SignCookieValue` as public wrapper; update `ExtractFromRequest` to use `securecookie.Decode` first, then fall back to `verifySignedValue` (old HMAC, ~2h TTL), then fall back to `json.Unmarshal` (current raw JSON format)
  - Remove `crypto/hmac` and `crypto/sha256` imports (swap for `github.com/gorilla/securecookie`)
  - Run `go get github.com/gorilla/securecookie`
  - Note: `src/app/actions.ts` signing logic already removed — the file now stores raw JSON (Next.js `cookie.serialize` handles URI-encoding). File removal still pending when all callers migrate to `POST /api/auth/cookie`.
- [ ] Register routes in `cmd/konsulin-app/main.go`: `POST /api/auth/cookie`, `DELETE /api/auth/cookie`
- [ ] Update `src/config/frontendConfig.ts` — replace `setCookies()` call with `POST /api/auth/cookie` in `onHandleEvent('SUCCESS')`
- [ ] Update `src/services/auth.ts` (`restoreAuthCookie`) — replace `setCookies()` with `POST /api/auth/cookie`
- [ ] Update profile edit handlers that refresh the auth cookie — use new endpoint
- [ ] Remove `src/app/actions.ts` (no longer needed once all callers migrate)
- [ ] Write `internal/handler/auth_cookie_test.go`

# Reference

@src/app/actions.ts:

- `setCookies(sessionName, sessionData)` — Next.js server action that sets server-side cookie
- Remove: entire file after all callers migrate to `POST /api/auth/cookie`

@src/config/frontendConfig.ts (onHandleEvent: SUCCESS):

- Calls `setCookies('auth', JSON.stringify(cookieData))` after profile creation
- Replace: HTTP POST to `/api/auth/cookie` with same cookieData in body

@src/services/auth.ts (restoreAuthCookie):

- Rebuilds auth cookie from SuperTokens session claims via `setCookies()`
- Replace: HTTP POST to `/api/auth/cookie`

@src/app/profile/[path]/edit-profile.tsx:

- Refreshes auth cookie after profile update via `setCookies()`
- Replace: HTTP POST to `/api/auth/cookie`

@internal/handler/auth.go (NewLogoutHandler):

- Existing pattern for clearing cookies with `Secure`, `HttpOnly`, `SameSite`
- Reference: use same `http.Cookie` options for new endpoint

@docs/plans/004d-auth-pages-migration.md:

- **Consumer:** auth pages use this endpoint to set cookie after SuperTokens login

# Risks

| Risk                                                       | Likelihood | Impact | Mitigation                                                                                          |
| ---------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------- |
| Unauthenticated callers set arbitrary auth cookie          | Low        | High   | Validate request: require SuperTokens session token in request header; reject if mismatch           |
| Frontend callers not migrated before server action removal | Medium     | High   | Keep both working during transition; remove server action only after all callers confirmed migrated |

# UAT

1. `POST /api/auth/cookie` with valid body -> `auth` cookie set in response
2. `DELETE /api/auth/cookie` -> `auth` cookie cleared
3. Login flow completes -> auth cookie set, user redirects to `/`
4. Profile update -> auth cookie refreshed with new data
5. Page refresh after login -> session persists (cookie present)
