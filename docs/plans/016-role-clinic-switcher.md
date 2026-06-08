---
title: Role Switcher via Header Profile Picture
description: Stacked avatar circles, popup with role list, POST to existing endpoint
date: 2026-06-06
---

# Overview

Replace the single-avatar header with stacked circles for multi-role users.
Clicking opens a popup with Profile link and role list. Uses existing
`/auth/role/switch` endpoint. No new Go endpoint required initially.

Supersedes original 016 scope (nav-based dropdown, clinic switcher).

# Goals

- Multi-role header shows stacked circles, active role on top
- Single-role users keep current behavior (Link to /profile)
- Popup contains Profile link + per-role avatars with switch action
- FHIR batch request fetches all role profiles in one API call
- Role switch works via existing `/auth/role/switch` with CSRF

# Implementation Steps

- [ ] Revise 016 plan file (this document)
- [ ] Create `src/services/batch-profile.ts` — single `POST /fhir` batch Bundle
- [ ] Create `src/components/role-avatar-popup.tsx` — stacked circles + DropdownMenu
- [ ] Modify `src/components/page-header.tsx` — conditionally render RoleAvatarPopup
- [ ] (Optional) Create `internal/handler/context.go` — `POST /context/role` JSON endpoint

# Reference

@src/constants/roles.ts:

- Patient → Patient, Practitioner → Practitioner, ClinicAdmin → Person (FHIR mapping)

@src/components/page-header.tsx:

- Lines 154-178: current avatar + Link block. Replace with conditional render.

@src/context/auth/authTypes.ts:

- `IStateUserInfo.roles: string[]` — already available for multi-role detection

@internal/handler/role_switcher.go:

- Existing `/auth/role/switch` — form POST, updates role in cookie, sets `HX-Redirect`
- React can POST form-urlencoded with CSRF token

# Risks

| Risk                              | Likelihood | Impact | Mitigation                                            |
| --------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| `/auth/role/switch` needs CSRF    | Medium     | Low    | Use same `fetchCSRFToken()` pattern as `/auth/cookie` |
| FHIR Person resource not deployed | Medium     | Medium | Fallback to initials for ClinicAdmin                  |
| Stacked circles overlap poorly    | Low        | Low    | Fixed 32x32 container, test on breakpoints            |

# UAT

1. Single-role user: single avatar, click navigates to /profile (unchanged)
2. Multi-role user: stacked circles appear, click opens popup
3. Popup shows Profile icon + link to /profile
4. Popup shows other roles with their FHIR profile photos
5. Clicking a role POSTs to `/auth/role/switch`, redirects to / with new role
6. ClinicAdmin shows initials fallback if no Person resource
