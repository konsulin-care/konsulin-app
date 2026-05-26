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

# Business Rules

- Auth cookie (`auth`) stores userId, role_name, fhirId, profile_complete
- sAccessToken/sRefreshToken set by SuperTokens client SDK
- Protected routes redirect to /auth if no cookie
- Role-based access: practitioner routes need practitioner role
- Return URL appended to login redirect
- Guest users can access assessments without auth
