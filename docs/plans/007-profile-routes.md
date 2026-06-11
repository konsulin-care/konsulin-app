---
title: Profile Pages — React SPA
description: Profile pages as React components with React Query
date: 2026-06-10
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route patterns and @docs/wiki/006-data-types.md for FHIR type definitions.

Profile view and edit form use React Query through `GET /proxy/fhir/*`. No Go SSR involved — Go BFF only proxies authenticated FHIR requests. Aligned with ADR-015.

Approach: keep existing query-param routing (`/profile?path=edit-profile`). Add IndexedDB draft persistence so browser back/forward restores form state cleanly. Add completeness banner (not redirect).

# Goals

- Keep query-param routing: `/profile` view + `/profile?path=edit-profile` edit form
- Profile view: role-based dispatch (Patient vs Practitioner), data via `useQuery`
- Profile edit: React form pre-filled via `useQuery`, validated client-side
- Update via `useMutation` through proxy; invalidate query on success
- IndexedDB draft persistence: auto-save form edits, restore on back/forward
- Role-aware: patients edit Patient, practitioners edit Practitioner
- Profile completeness banner — banner with edit link on view page if incomplete

# Implementation Steps

- [ ] Add `profileEditDrafts` store to `src/lib/indexeddb.ts:STORES`
- [ ] Create `src/hooks/useProfileEditDraft.ts` — IndexedDB load/save/clear for form drafts
- [ ] Create `src/hooks/usePractitionerProfile.ts` — Practitioner query hook
- [ ] Create `src/hooks/useProfileCompleteness.ts` — completeness check (server flag + FHIR)
- [ ] Move `src/components/shared/hooks/usePatientProfile.ts` → `src/hooks/usePatientProfile.ts`
- [ ] Create `src/components/profile/completeness-banner.tsx` — dismissible banner with edit link
- [ ] Update `src/app/profile/profile-display.tsx` — wire CompletenessBanner
- [ ] Update `src/app/profile/patient.tsx` — expose profileData for completeness
- [ ] Update `src/app/profile/clinician.tsx` — expose profileData for completeness
- [ ] Update `src/app/profile/edit-profile.tsx` — wire useProfileEditDraft + invalidate on success + refresh auth completeness state
- [ ] Write `src/app/profile/__tests__/profile.test.tsx` — mock fetch, verify role dispatch, form submission, draft persistence, completeness banner

# Reference

@src/app/profile/page.tsx:

- Main profile page: role-based dispatch via search param path
- Keep: same role-aware dispatch in React SPA
- Adapt: replace direct FHIR fetch with useQuery('/proxy/fhir/...')

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
- Keep: service functions as-is; extract new hooks to src/hooks/

@src/lib/indexeddb.ts:

- IndexedDB abstraction: STORES, dbGet, dbSet, dbDelete
- Add: profileEditDrafts store keyed by fhirId

# Risks

| Risk                                  | Likelihood | Impact | Mitigation                                             |
| ------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| IndexedDB draft conflicts with tabs   | Low        | Low    | Use updatedAt timestamp: newer of draft vs API wins    |
| Large photo dataUrl in IndexedDB      | Low        | Low    | Store photo URL, not blob; upload handled separately   |
| Stale completeness flag after edit    | Low        | Medium | Dispatch auth-check after mutation to refresh flag     |
| FHIR Patient vs Practitioner mismatch | Low        | High   | Check role in session before determining resource type |

# UAT

1. Login as patient — visit /profile — shows patient profile data
2. Profile incomplete — yellow banner with "Edit Profile" link
3. Click link — /profile?path=edit-profile loads with form pre-filled
4. Edit fields — browser back (view) → forward (edit) — form restores unsaved changes from IndexedDB
5. Submit valid data — profile updates, banner disappears, view reflects changes
6. Submit invalid data — client-side validation errors shown, no API call
7. Login as practitioner — same flow with Practitioner resource
