---
title: Agentic Documentation internal/session
description: Cookie-based session helpers — auth tokens, role context, clinic context
---

## Relevant ADRs

| ADR | Rationale                                                                   |
| --- | --------------------------------------------------------------------------- |
| 001 | Cookie-based session storage for auth tokens; no server-side session store  |
| 008 | Stores active role selection; server reads from session on every request    |
| 009 | Stores active clinic context for multi-clinic admins; drives route behavior |

## Rules

- Session is cookie-based only — no server-side session store, no in-memory cache
- Role and clinic context must be read from session on every request, never cached between requests
- Switching roles or clinics reloads the page in the new context
- Form state across HTMX requests requires hidden inputs or `hx-vals` (session not preserved in partial state)
- Session must be signed/encrypted for security; use `gorilla/securecookie` or equivalent
- Session helper provides `GetRole(r *http.Request)`, `GetClinicID(r *http.Request)`, `SetRole`, `SetClinicID` functions
