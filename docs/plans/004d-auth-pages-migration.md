---
title: Auth Pages Migration
description: SuperTokens React SPA embed for post-Next.js login
date: 2026-05-27
---

# Overview

Before implementing, read @docs/wiki/005-auth-session.md for current SuperTokens auth flow and @docs/plans/014-assessment-spa-shell.md for the React SPA embed precedent.

The SuperTokens login/register UI (`/auth/*`) is a React SPA built with `supertokens-auth-react` (ssr: false). Currently served by Next.js. After Next.js removal, Go SSR serves the auth pages using the same embed pattern as plan 014 (assessment SPA shell):

- Go SSR renders a shell HTML page with a `<div id="supertokens-root">` mount point
- The React bundle is served as static JS from `web/auth-spa/`
- SuperTokens SDK communicates directly with the backend API (not through Go proxy)
- Auth cookie (`auth`) is set by the backend plan 004c handler, not by Next.js server actions

Depends on: plan 004c (auth cookie management — must exist before auth pages can set the cookie)
Shared pattern with: plan 014 (assessment SPA shell — same React embed architecture)

# Goals

- `GET /auth`, `GET /auth/*` served by Go SSR as React SPA shell
- SuperTokens passwordless login (email OTP and magic link) works without Next.js
- ThirdParty login (Google, WhatsApp) works without Next.js
- Post-login `onHandleEvent('SUCCESS')` calls plan 004c's cookie API instead of Next.js server action
- Auth cookie restoration (`restoreAuthCookie`) handled by plan 004c, not client JS
- Remove `src/app/auth/[[...path]]/page.tsx`, `src/config/frontendConfig.ts`, `src/components/supertokensProvider.tsx`

# Implementation Steps

- [ ] Create `web/auth-spa/` directory — SuperTokens React SPA bundle (built from JSX source)
- [ ] Create `web/template/pages/auth/shell.templ` — HTML shell with `<div id="supertokens-root">` mount point and runtime config injection
- [ ] Create `internal/handler/auth_pages.go` — serves shell for `/auth` and `/auth/*` catch-all
- [ ] Register routes: `GET /auth`, `GET /auth/*` in Chi router (before proxy catch-all)
- [ ] Adapt `src/config/frontendConfig.ts` for standalone SPA: remove Next.js router references, call plan 004c cookie endpoint on success
- [ ] Adapt `src/services/auth.ts` (restoreAuthCookie) — replace Next.js server action with plan 004c API call
- [ ] Remove `src/components/supertokensProvider.tsx` — init happens in SPA entry point
- [ ] Remove `src/app/auth/[[...path]]/` entire directory
- [ ] Write `internal/handler/auth_pages_test.go`

# Reference

@src/app/auth/[[...path]]/page.tsx:

- SuperTokens auth page: renders Passwordless + ThirdParty prebuilt UI
- Adapt: same SuperTokens components embedded in standalone SPA bundle
- WhatsApp footer button preserved

@src/config/frontendConfig.ts:

- SuperTokens init: Passwordless (EMAIL_OR_PHONE), ThirdParty, styling overrides
- onHandleEvent('SUCCESS'): creates profile, sets auth cookie via server action
- Adapt: keep SuperTokens config; replace setCookies() call with plan 004c API endpoint
- Remove: router.push() calls (no Next.js router in standalone SPA)

@src/config/appInfo.ts:

- Runtime config reader for apiDomain, websiteDomain, apiBasePath
- Adapt: config injected via Go SSR `window.__RUNTIME_CONFIG__` (same as plan 014)

@src/components/supertokensProvider.tsx:

- Initializes SuperTokens on mount
- Replace: init happens in SPA entry point JS

@src/services/auth.ts (restoreAuthCookie):

- Rebuilds auth cookie from SuperTokens session claims via server action
- Replace: call plan 004c's auth cookie endpoint instead

@docs/plans/014-assessment-spa-shell.md:

- Precedent for React SPA embed: shell templ, static JS bundle, runtime config
- Same pattern for auth SPA shell

@docs/plans/004c-auth-cookie-management.md:

- **Prerequisite:** defines how the auth cookie is set without Next.js server actions
- onHandleEvent('SUCCESS') calls this plan's endpoint instead of `setCookies()`

# Risks

| Risk                                                                          | Likelihood | Impact | Mitigation                                                      |
| ----------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| SuperTokens SDK version incompatible with standalone SPA                      | Low        | High   | Pin SDK version; test in isolation before removing Next.js      |
| Duplicate React SPA patterns (assessment + auth)                              | Low        | Medium | Extract shared shell utility if patterns diverge                |
| Post-login redirect (`redirect_intent` cookie) not consumed by standalone SPA | Medium     | Medium | SPA reads cookie via `document.cookie` (same as plan 004a flow) |

# UAT

1. Visit `/auth` — SuperTokens login form renders (email input, WhatsApp button)
2. Enter email — receive magic link or OTP
3. Complete login — redirected to `/` with `auth` cookie set
4. Visit `/auth` while authenticated — redirected to `/` (same as current middleware behavior)
5. Visit `/auth/verify?token=...` — magic link verification works
