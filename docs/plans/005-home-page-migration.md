---
title: Home Page — Role-Based Dashboard
description: Role-aware home page in Next.js React SPA — guest, patient, practitioner, clinic admin
date: 2026-06-05
---

# Overview

Home page (`GET /`) served by Next.js static export via Go BFF. All
data fetched client-side through `GET /proxy/fhir/*`. This plan covers
role-aware content, layout, and data-fetching per user type. Aligned
with ADR-015: Go is pure BFF, no Go SSR.

# Dashboard Design per Role

| Role         | Primary Content                                                 | Secondary Content                                   |
| ------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| Guest        | Same as patient (recommendation cards)                          | Quick actions, popular assessments                  |
| Patient      | Recommendation cards (last used specialty, fallback to popular) | Quick actions (journal, assessment), recent records |
| Practitioner | Unified calendar with today's schedule (ADR-005)                | Quick SOAP action, today's patient list, stats      |
| Clinic Admin | Operational overview — practitioner counts, pending approvals   | Clinic context switcher, service management links   |

Guest sees same as patient; "Book" triggers login for guest, books
directly for patient.

# Goals

- Guest/patient: recommendation cards primary + quick actions secondary
- Patient defaults to last used specialty; fallback to popular
- Practitioner: unified calendar (delegated to 018)
- Clinic admin: operational governance overview
- All data fetched client-side via React Query → `/proxy/fhir/*`
- Role switch → React Query cache invalidation
- Mobile-responsive with hamburger menu

# Implementation Steps

- [ ] Verify `GET /` serves `out/index.html`, React hydrates,
      `/proxy/fhir/*` fetches succeed
- [ ] Refactor `src/app/page.tsx` — client-side session via cookies-next
- [ ] Enhance `src/app/home-content.tsx` — role dispatch from cookie
- [ ] Enhance `src/app/home-header.tsx` — greeting, avatar via React Query
- [ ] Enhance `src/app/home-content-patient.tsx` — recommendation cards
      primary (017), quick actions secondary
- [ ] Enhance `src/app/home-content-guest.tsx` — same as patient;
      "Book" triggers login
- [ ] Enhance `src/app/home-content-clinician.tsx` — unified calendar
      (018), SOAP action, patient list
- [ ] Create `src/app/home-content-admin.tsx` — clinic overview,
      practitioner counts, approvals, context switcher
- [ ] Wire all data via React Query → `/proxy/fhir/*`
- [ ] Invalidate React Query on role switch
- [ ] Handle empty/loading/error states
- [ ] Write tests: `src/__tests__/home-content-*.test.tsx`

# Reference

`src/app/page.tsx` — orchestrator; keep, ensure cookies-next session
`src/app/home-content.tsx` — role dispatcher; keep as-is
`src/app/home-header.tsx` — header; keep, data via React Query
`src/app/home-content-guest.tsx` — enhance: merged with patient
`src/app/home-content-patient.tsx` — enhance: recs primary (017)
`src/app/home-content-clinician.tsx` — enhance: calendar (018)
`src/components/icons/house-icon.tsx` — keep, React component

# Risks

| Risk                                  | Lkl | Impact | Mitigation                                    |
| ------------------------------------- | --- | ------ | --------------------------------------------- |
| Missing FHIR data empty home          | Med | Med    | Skeleton + "no data" fallback                 |
| Role cookie not on initial render     | Low | High   | `document.cookie` via cookies-next on mount   |
| React Query stale on role switch      | Med | Med    | `invalidateQueries()` on role change event    |
| Mobile nav differs from old Alpine.js | Low | Med    | Existing React responsive patterns; test view |

# UAT

1. Visit `/` as guest — recommendation cards, "Book" → login
2. Login as patient — same cards, "Book" → booking flow
3. Patient cards show last-used specialty; fallback to popular
4. Practitioner home — unified calendar with today's schedule
5. Clinic admin — operational overview with context switcher
6. Mobile — hamburger menu toggles nav
