---
title: Auth & Session Assessment
description: SuperTokens React SDK, cookie flow, login/register, auth guard
domain: frontend
action: adapt
dependencies: []
---

# Summary

SuperTokens authentication is currently handled entirely on the
client side via `supertokens-auth-react`. The React SDK manages
sessions, sets `sAccessToken`/`sRefreshToken` cookies, and restores
`auth` cookie via server action. Go SSR reads these cookies for
route guarding and renders the login page as a pass-through.

# Current Flow

```
Browser: supertokens-auth-react → manages session → sets cookies
  → Next.js middleware reads cookies → guards routes
  → Go SSR (future) reads same cookies → guards routes
```

# Key Files

| File                                | Purpose                     | Action                     |
| ----------------------------------- | --------------------------- | -------------------------- |
| `src/middleware.ts`                 | Auth guard via cookie check | Port to Go middleware      |
| `src/config/frontendConfig.ts`      | SuperTokens config          | Keep for React SPA page    |
| `src/app/auth/[[...path]]/page.tsx` | Login UI                    | Keep for React SPA         |
| `src/services/auth.ts`              | Cookie restoration          | Remove (Go reads directly) |

# Cookie Architecture

| Cookie            | HttpOnly | SameSite | Secure | MaxAge  | Set in                   |
| ----------------- | -------- | -------- | ------ | ------- | ------------------------ |
| `auth`            | true     | Lax      | config | 2h      | Go BFF POST /auth/cookie |
| `sAccessToken`    | true     | Lax      | config | -1\*    | SuperTokens SDK          |
| `sRefreshToken`   | true     | Lax      | config | -1\*    | SuperTokens SDK          |
| `sIdRefreshToken` | true     | Lax      | config | -1\*    | SuperTokens SDK          |
| `anon_session`    | true     | Lax      | config | 24h     | Backend API via proxy    |
| `redirect_intent` | false    | Lax      | config | 300s    | JS document.cookie       |
| `_gorilla_csrf`   | true     | Lax      | config | session | CSRF middleware          |

- Cleared (MaxAge=-1) by logout handler, not SuperTokens.

# Guest (Anonymous) Session Flow

1. User visits app for the first time — no cookies exist.
2. Go BFF `OptionalAuth` middleware: no auth cookie, no `anon_session` cookie → injects `{Role: "Guest"}` with empty GuestID. Request proceeds to Next.js.
3. React hydrates, calls `ensureAnonymousSession()` → `POST /api/v1/auth/anonymous-session` (proxied to backend).
4. Backend creates anonymous session, returns `{ guest_id, token }` in body and sets `Set-Cookie: anon_session=<JWT>` (HttpOnly, 24h).
5. Browser stores `anon_session` cookie. Client uses `guest_id` from response body for FHIR Identifiers.
6. Next page navigation: Go BFF middleware reads `anon_session` cookie, decodes JWT payload → injects `{GuestID, Role: "Guest", Token}` into request context.

# Business Rules

- Auth cookie (`auth`) stores userId, role_name, fhirId, profile_complete
- sAccessToken/sRefreshToken set by SuperTokens client SDK
- Protected routes redirect to /auth if no cookie
- Role-based access: practitioner routes need practitioner role
- Return URL appended to login redirect
- Guest users can access assessments without auth
