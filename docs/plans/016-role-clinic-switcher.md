---
title: Role & Clinic Context Switcher
description: Nav dropdown, session-based context switching
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/004-state-management.md for current auth context patterns and @docs/wiki/005-auth-session.md for session handling.

Implement the role context switcher (ADR-008) and clinic context
switcher (ADR-009) in the navigation header. Users with multiple roles
select active role via dropdown; clinic admins select active clinic.
Changes update the server-side session for subsequent requests.

# Goals

- Role switcher dropdown in nav for multi-role users
- Clinic context switcher dropdown for multi-clinic admins
- HTMX POST updates session on switch, partial refreshes nav
- Session stores active role and active clinic
- All subsequent requests use the selected context

# Implementation Steps

- [ ] Update `internal/session/session.go` — add ActiveRole, ActiveClinicID fields
- [ ] Create `internal/handler/context.go` — POST /context/role, POST /context/clinic handlers
- [ ] Create `web/template/partials/nav/role-switcher.templ` — dropdown with user's roles
- [ ] Create `web/template/partials/nav/clinic-switcher.templ` — dropdown with admin's clinics
- [ ] Update `web/template/layout/base.templ` — render switchers in nav header
- [ ] Wire session update into response via Set-Cookie or HTMX response header
- [ ] Write `internal/handler/context_test.go` — verify role/clinic switch updates session

# Reference

@src/constants/roles.ts:

- Role constants: Practitioner, Patient, Guest
- Reimplement: same roles as Go enum/constants

@src/components/navigation-bar.tsx:

- Bottom nav: 5 tabs with role-aware routing (Clinic vs Schedule)
- Adapt: tab visibility and target depend on active role + clinic context
- Reimplement: same role-aware nav in base.templ with Alpine.js

@src/context/auth/authContext.tsx:

- Auth context: provides auth state and user info
- Replace: Go middleware injects session into request context

@src/context/auth/authTypes.ts:

- IStateUserInfo: userId, role_name, email, fullname, fhirId, profile_complete
- Reimplement: same fields in Go session struct

@src/utils/intent-storage.ts:

- Intent storage: save/get/clear with 6-hour TTL
- Adapt: Go handles intents via session or URL params

@src/components/icons/house-icon.tsx + office-icon.tsx + literature-icon.tsx + user-icon.tsx + exercise-icon.tsx:

- All 5 nav icons affected by role/clinic context switching
- Reimplement: inline SVGs in base.templ; ExerciseIcon removed in M013

# Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                    |
| ---------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| HTMX partial doesn't update all UI elements    | Medium     | Medium | Use `hx-swap-oob` to update nav and content simultaneously    |
| Context cookie doesn't persist across requests | Low        | High   | Set cookie with domain-wide path; verify via integration test |

# UAT

1. Login as multi-role user (e.g. patient + practitioner)
2. Click role switcher — dropdown shows both roles
3. Switch to practitioner — nav updates, content shows practitioner UI
4. Login as multi-clinic admin — clinic switcher appears
5. Switch clinic — management data updates to selected clinic
