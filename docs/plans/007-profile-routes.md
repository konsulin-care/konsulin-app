---
title: Profile Pages — React SPA
description: Profile pages as React components with React Query
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route patterns and @docs/wiki/006-data-types.md for FHIR type definitions.

Rewrite `/profile*` as Next.js React SPA pages. Profile view and edit
form use React Query through `GET /proxy/fhir/*`. No Go SSR involved —
Go BFF only proxies authenticated FHIR requests. Aligned with ADR-015.

# Goals

- `GET /profile` — React page, role-based dispatch (Patient vs Practitioner), data via `useQuery`
- `GET /profile/edit` — React form pre-filled via `useQuery`, validated client-side
- `POST /profile/edit` — update via `useMutation` through proxy; invalidate query on success
- Role-aware: patients edit Patient resource, practitioners edit Practitioner
- Profile completeness check — redirect to edit if incomplete

# Implementation Steps

- [ ] Create `src/app/profile/page.tsx` — role-dispatch component fetches via `useQuery('/proxy/fhir/Patient/{fhirId}')` or `useQuery('/proxy/fhir/Practitioner/{fhirId}')`
- [ ] Create `src/app/profile/edit/page.tsx` — form with React Hook Form or controlled state; submit via `useMutation`
- [ ] Add React Query hook `usePatientProfile(fhirId)` and `usePractitionerProfile(fhirId)` in `src/hooks/`
- [ ] Add mutation hook `useUpdateProfile(resourceType)` — PUT through `/proxy/fhir/`
- [ ] Add profile completeness guard — check required fields after fetch, redirect to edit
- [ ] Write `src/app/profile/__tests__/profile.test.tsx` — mock fetch, verify role dispatch and form submission

# Reference

@src/app/profile/page.tsx:

- Main profile page: role-based dispatch to clinician or patient profile
- Keep: same role-aware dispatch in React SPA
- Adapt: replace direct FHIR fetch with `useQuery('/proxy/fhir/...')`

@src/app/profile/patient.tsx:

- Patient profile: displays and edits Patient FHIR resource fields
- Keep: same form fields in React Hook Form

@src/app/profile/clinician.tsx:

- Clinician profile: Practitioner resource fields, weekly availability editor
- Keep: same fields; replace Alpine.js availability editor with React component

@src/app/profile/utils/index.ts:

- Availability form utilities: validateTimeRanges, convertToFhirAvailableTimeForOrganization
- Keep: same validation + FHIR conversion logic as pure functions

@src/services/profile.tsx:

- Profile service: createProfile, getProfileByIdentifier, getProfileById, updateProfile
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@src/components/icons/user-icon.tsx:

- UserIcon — used for Profile nav tab
- Keep: same icon component in React

# Risks

| Risk                                  | Likelihood | Impact | Mitigation                                             |
| ------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| FHIR Patient vs Practitioner mismatch | Low        | High   | Check role in session before determining resource type |
| Form state lost on navigation         | Low        | Medium | Persist form draft in local state or URL params        |
| Proxy returns stale cached data       | Low        | Low    | Set `staleTime` in React Query to appropriate interval |

# UAT

1. Login as patient — visit `/profile` — shows patient profile data
2. Click edit — form pre-fills with current values
3. Submit with invalid data — client-side validation errors shown
4. Submit valid data — profile updates, view reflects changes
