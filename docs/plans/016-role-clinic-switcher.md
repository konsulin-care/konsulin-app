---
title: Role & Clinic Context Switcher
description: React context switcher, cookie-based session
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/004-state-management.md for current auth context patterns and @docs/wiki/005-auth-session.md for session handling.

Implement the role context switcher (ADR-008) and clinic context
switcher (ADR-009) as React components. Users with multiple roles
select active role via dropdown; clinic admins select active clinic.
Changes POST to Go BFF endpoint (sets cookie), then React context
updates the UI. No Go SSR, no HTMX. Aligned with ADR-015.

# Goals

- Role switcher dropdown in nav for multi-role users — React component
- Clinic context switcher dropdown for multi-clinic admins — React component
- Fetch POST to `/context/role` or `/context/clinic` updates server cookie
- React Context (`AuthContext`) stores active role and active clinic
- All subsequent requests include cookie for server-side context
- Navbar re-renders via React state when context changes

# Implementation Steps

- [ ] Extend `src/context/auth/authContext.tsx` — add ActiveRole, ActiveClinicID to context value
- [ ] Create `src/components/nav/role-switcher.tsx` — dropdown listing user's roles; onChange does `fetch('/context/role', { method: 'POST', body: JSON.stringify({role}) })`
- [ ] Create `src/components/nav/clinic-switcher.tsx` — dropdown listing admin's clinics; onChange does `fetch('/context/clinic', ...)`
- [ ] On response, update React context state (triggers navbar re-render)
- [ ] Update `src/components/navigation-bar.tsx` — render switchers in nav header (role-aware tab visibility)
- [ ] Go BFF: keep `POST /context/role` and `POST /context/clinic` handlers (already needed for cookie)
- [ ] Write `src/components/nav/__tests__/switcher.test.tsx` — mock fetch, verify role/clinic switch updates UI

# Reference

@src/constants/roles.ts:

- Role constants: Practitioner, Patient, Guest
- Keep: same TypeScript constants

@src/components/navigation-bar.tsx:

- Bottom nav: 5 tabs with role-aware routing (Clinic vs Schedule)
- Keep: same role-aware nav in React; tab visibility depends on active role + clinic context

@src/context/auth/authContext.tsx:

- Auth context: provides auth state and user info
- Keep: React Context pattern; add ActiveRole, ActiveClinicID fields

@src/context/auth/authTypes.ts:

- IStateUserInfo: userId, role_name, email, fullname, fhirId, profile_complete
- Keep: same TypeScript type; extend with ActiveRole, ActiveClinicID

@src/utils/intent-storage.ts:

- Intent storage: save/get/clear with 6-hour TTL
- Keep: client-side intent pattern for guest → login flows

# Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                    |
| ---------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Context cookie doesn't persist across requests | Low        | High   | Set cookie with domain-wide path; verify via integration test |
| Context not propagated to all nav elements     | Low        | Medium | Single React context provider wraps entire app                |

# UAT

1. Login as multi-role user (e.g. patient + practitioner)
2. Click role switcher — dropdown shows both roles
3. Switch to practitioner — nav updates, content shows practitioner UI
4. Login as multi-clinic admin — clinic switcher appears
5. Switch clinic — management data updates to selected clinic
