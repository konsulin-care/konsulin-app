---
title: Auth Security Hardening
description: Session expiry, unsigned fallback removal, CSRF, cookie forwarding fix
date: 2026-05-28
---

# Overview

Plan 004c introduces gorilla/securecookie to replace the raw JSON auth cookie. After that migration completes, four remaining security gaps must be closed:

1. **Unsigned JSON fallback** in `ExtractFromRequest` — after all callers use securecookie, remove this path entirely
2. **No server-side session expiry** — the cookie has a `maxAge` but the Go server never validates it
3. **Cookie forwarding over cleartext** — `tryBackendLogout` copies all cookies to the backend URL regardless of scheme
4. **No CSRF protection** — `POST /auth/logout` and future state-changing routes have no CSRF tokens

These apply only to Go SSR routes. The Next.js routes had the same gaps (or worse — no signature at all) so this is not a regression.

# Goals

- `ExtractFromRequest` accepts only signed+encrypted cookies (securecookie or legacy HMAC); raw JSON rejected
- Server validates session expiry from cookie payload; expired sessions treated as missing
- `tryBackendLogout` validates backend URL scheme is HTTPS before forwarding cookies
- All state-changing Go SSR routes (POST/PUT/DELETE) protected by CSRF middleware
- All session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` (when available)

# Implementation Steps

**WP 1: Remove unsigned cookie fallback** _(after 004c complete)_

- [ ] Add config flag `AllowUnsignedCookies bool` (default: `false` in production)
- [ ] In `ExtractFromRequest`: remove the `json.Unmarshal` fallback branch; return error if neither `securecookie.Decode` nor `verifySignedValue` succeeds
- [ ] Run test suite — confirm `TestExtractFromRequest_unsignedCookie` now fails
- [ ] Wait 2 weeks post-004c migration, then remove the config flag entirely

**WP 2: Add server-side expiry validation**

- [ ] Add `Exp int64` field (`json:"exp"`) to `Session` struct in `internal/session/session.go`
- [ ] In `POST /api/auth/cookie` handler (from 004c): set `Exp = time.Now().Add(2 * time.Hour).Unix()` on every cookie write
- [ ] In `ExtractFromRequest`: after successful decode, check `s.Exp > 0 && time.Now().Unix() > s.Exp` → return expired error
- [ ] Write tests: expired cookie → error, valid cookie → success, no-exp cookie → backward-compat accepted

**WP 3: Fix cookie forwarding in tryBackendLogout**

- [ ] In `tryBackendLogout` (`internal/handler/auth.go`): validate `backendURL` scheme is `https://` before forwarding cookies
- [ ] If scheme is `http://` in production: log warning and skip backend logout (local cookies still cleared)
- [ ] Add config option `AllowInsecureBackendLogout bool` for local dev environments
- [ ] Write tests: HTTP backend → skipped, HTTPS → forwarded, empty backend → skipped

**WP 4: Add CSRF protection**

- [ ] Add Go dependency: `github.com/gorilla/csrf` or `github.com/justinas/nosurf`
- [ ] Create `internal/middleware/csrf.go`:
  - Initialize with CSRF auth key from env var (`CSRF_AUTH_KEY`)
  - Set `Secure: cfg.CookieSecure`, `HttpOnly: true`
  - Exempt proxy routes (Next.js handles its own CSRF via SuperTokens)
  - Exempt health check and static routes
- [ ] Wire CSRF middleware in Chi router (after logging, before auth — order matters)
- [ ] Inject CSRF token into templ templates via context: `csrf.TokenFromContext(ctx)` in `gorilla/csrf` or `nosurf.Token(ctx)` in `nosurf`
- [ ] For HTMX: add `<meta name="csrf-token" content="{{ .CSRFToken }}">` in base layout and configure `hx-headers` via HTMX `meta` tag reader
- [ ] For JS-initiated POSTs: read token from meta tag and include as `X-CSRF-Token` header
- [ ] Write tests: POST without CSRF token → 403, POST with valid token → 200

**WP 5: Cookie attribute audit**

- [ ] Review all `http.Cookie` settings across:
  - `NewLogoutHandler` (`auth.go`) — `HttpOnly: true`, `SameSite: Lax`, `Secure` from config ✅
  - `POST /api/auth/cookie` handler (from 004c) — ensure same attributes
  - `guest_session` cookie (from 004a) — `HttpOnly=false` (browser JS needs it), `Secure` + `SameSite`
  - `redirect_intent` cookie (from 004a) — `HttpOnly=false`, `MaxAge=300`, `Secure` + `SameSite`
- [ ] Ensure `POST /api/auth/cookie` handler respects `CookieSecure` config field
- [ ] Write a cookie attribute table in the handler's godoc for maintainers

# Dependencies

- **WP 1**: Blocked on 004c completion + confirmation that all client callers migrated to `POST /api/auth/cookie`
- **WP 2–5**: Can run in parallel with plans 005–014 (no code conflicts)

# Risks

| Risk                                            | Likelihood | Impact | Mitigation                                                                                                  |
| ----------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| WP 1 breaks callers still sending unsigned JSON | Medium     | High   | Deploy with `AllowUnsignedCookies=true` initially; monitor logs; flip to `false` after confirming no errors |
| WP 2 expiry logic breaks long-running sessions  | Low        | Medium | Set `exp` to 2h (matching existing `maxAge`); users simply re-login                                         |
| WP 3 blocks backend logout in dev environments  | Low        | Low    | Default `localhost` dev URLs use `AllowInsecureBackendLogout=true`                                          |
| WP 4 CSRF breaks existing HTMX forms            | Medium     | Medium | Test all existing HTMX routes; use `hx-headers` with CSRF token from meta tag                               |
| WP 2–5 delay other migration plans              | Low        | Low    | They are additive — no breaking changes to existing Go SSR routes                                           |

# UAT

1. Visit Go SSR route with an unsigned JSON `auth` cookie — rejected, redirected to `/auth`
2. Visit Go SSR route with valid securecookie `auth` cookie — accepted, session injected in context
3. Wait 2h+ without activity, then visit protected route — session expired, redirected to `/auth`
4. `POST /auth/logout` without CSRF token — returns 403
5. `POST /auth/logout` with valid CSRF token — cookies cleared, redirected to `/auth`
6. In dev environment (`http://localhost`): logout still works (cookie forwarding skipped, local cookies still cleared)
7. All cookies inspected in browser DevTools: `HttpOnly`, `SameSite=Lax`, `Secure` flags set correctly
