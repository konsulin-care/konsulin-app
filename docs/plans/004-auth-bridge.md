---
title: Auth Bridge Middleware
description: Cookie reading, auth guard, session verification, user context
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/005-auth-session.md for current SuperTokens auth flow and session handling.

Implement auth bridge between SuperTokens client-side SDK and Go SSR.
Read auth cookies from requests, verify session with backend API, inject
user context (userId, role, fhirId, profileComplete) into request context,
and guard protected routes with redirect to login.

# Goals

- Auth middleware reads `sAccessToken` / `sRefreshToken` cookies
- Session verified via backend `GET /auth/session` (or SuperTokens Go SDK)
- Authenticated requests have user context in `context.Context`
- Unauthenticated requests redirect to `/auth` with `?redirect=` return URL
- Logout endpoint proxies SuperTokens session invalidation
- Role-based access control: certain routes restricted by role
- Tests for cookie parsing, session verification, redirect logic

# Implementation Steps

- [ ] Create `internal/session/session.go` — Session struct (UserID, Role, FHIRID, ProfileComplete), ExtractFromRequest helper that reads cookies
- [ ] Create `internal/session/session_test.go` — test cookie parsing with valid/missing/expired cookies
- [ ] Create middleware `middleware/auth.go` — AuthGuard that extracts session, verifies with backend, injects context or redirects
- [ ] Create `internal/handler/auth.go` — login redirect handler, logout proxy
- [ ] Create user context type and context key for passing session data to handlers
- [ ] Create `internal/handler/auth_test.go` — test protected route returns 302 without cookie, 200 with valid cookie
- [ ] Wire auth middleware into Chi router: public routes (health, static), protected route group
- [ ] Create helper `templutil.SessionFromContext(ctx)` for templates to access user data
- [ ] Update `web/template/layout/base.templ` to conditionally render nav based on auth state
- [ ] Verify: protected routes block unauthenticated, pass authenticated

# Reference

@src/utils/redirect-guard.ts:

- Safe redirect validator: extracts `redirectToPath` from query param, validates relative path
- Reimplement: same security rules in Go (relative path, no ://, no backslashes, max 256 chars)

@src/config/frontendConfig.ts:

- SuperTokens frontend config: Passwordless (EMAIL_OR_PHONE) + ThirdParty UI buttons
- Adapt: Go server reads same cookies (sAccessToken, sRefreshToken) set by SuperTokens SDK
- Note: SuperTokens client SDK runs in browser; Go server only reads cookies it sets

@src/context/auth/authTypes.ts:

- Auth state types: IStateAuth, IStateUserInfo (userId, role_name, email, fhirId, profile_complete)
- Reimplement: same fields in Go session struct

@src/context/auth/authContext.tsx:

- Auth context provider: initializes session via SuperTokens, handles anonymous sessions
- Replace: Go middleware injects session into request context on every request
- Note: no React context in Go SSR — session lives in `context.Context`

@src/middleware.ts:

- Edge middleware: route protection, auth guard, role check, return URL preservation
- Adapt: port cookie parsing, role-based route access, and redirect logic to Go middleware
- Keep: same `publicRoutes`, `patientRoutes`, `clinicianRoutes` access patterns

@src/services/auth.ts:

- Auth cookie restoration: recreates auth cookie from SuperTokens session claims
- Adapt: Go verifies session via backend API instead of cookie manipulation

# Risks

| Risk                                      | Likelihood | Impact | Mitigation                                                                     |
| ----------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| SuperTokens SDK version mismatch          | Low        | High   | Use SuperTokens Go SDK for session verification at `/auth/session` endpoint    |
| Cookie name changed by SuperTokens config | Low        | Medium | Make cookie names configurable via env var                                     |
| Session expired mid-session               | Medium     | Low    | HTMX handles 401 via `HX-Redirect` header to re-trigger login                  |
| Redirect loop on auth failure             | Low        | Medium | Exclude `/auth` from auth guard; check redirect URL is not the same as current |

# UAT

1. Visit protected route without auth — redirected to `/auth?redirect=<return_url>`
2. Login via SuperTokens flow — session cookies set
3. Visit protected route while authenticated — page renders with user name in nav
4. Logout — session cleared, protected routes redirect again
5. Switch role — user context reflects new role in subsequent requests
