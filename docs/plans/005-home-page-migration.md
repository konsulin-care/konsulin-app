---
title: Home Page Migration
description: Role-aware GET / in templ, HTMX, Alpine.js
date: 2026-05-26
---

# Overview

Migrate the root route `GET /` from Next.js to Go SSR. The home page
displays role-aware content (guest, patient, practitioner, clinic admin)
with an HTMX-driven role header and Alpine.js mobile nav toggle.

# Dashboard Design per Role

| Role         | Primary Content                                                 | Secondary Content                                              |
| ------------ | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Guest        | Same as patient (recommendation cards)                          | Quick actions, popular assessments, community                  |
| Patient      | Recommendation cards (last used specialty, fallback to popular) | Quick actions (journal, assessment), recent records, community |
| Practitioner | Unified calendar with today's schedule (ADR-005)                | Quick SOAP action, today's patient list, stats                 |
| Clinic Admin | Operational overview — practitioner counts, pending approvals   | Clinic context switcher, service management links              |

Guest sees the same content as patient. The difference: clicking "Book" on a recommendation card triggers login redirect for guest; patient books directly.

# Goals

- `GET /` served by Go SSR for authenticated and anonymous users
- Guest/patient home shows recommendation cards (primary) + quick actions, assessments, community (secondary)
- Practitioner home shows unified calendar as primary content (M018)
- Clinic admin home shows operational governance overview
- Patient recommendation defaults to last used specialty; fallback to popular
- Guest sees same content as patient; booking triggers login redirect
- HTMX partial for switching roles without full page reload
- Alpine.js toggle for mobile navigation
- Existing Next.js routes (non-home) still served via proxy

# Implementation Steps

- [ ] Register `GET /` in Chi router — checks session, dispatches to role-specific templ component
- [ ] Create `web/template/pages/home/patient-guest.templ` — shared recommendation cards, quick actions, community
- [ ] Create `web/template/pages/home/practitioner.templ` — unified calendar (M018), quick SOAP, patient list
- [ ] Create `web/template/pages/home/admin.templ` — clinic overview, pending approvals, practitioner counts
- [ ] Create `internal/service/home.go` — fetch role-specific data from FHIR backend
- [ ] Create `internal/handler/home.go` — handler that reads session, fetches data, renders templ
- [ ] Update `web/template/layout/base.templ` — wire nav with role switcher dropdown (HTMX) and mobile menu toggle (Alpine.js x-show)
- [ ] Add HTMX endpoint `GET /partials/nav/role-switcher` — partial for role dropdown
- [ ] Add Alpine.js `x-data` for mobile menu toggle in base layout
- [ ] Write `internal/handler/home_test.go` — test each role renders correct content
- [ ] Write `internal/service/home_test.go` — mock FHIR client, verify data aggregation
- [ ] Verify: home renders correctly for each role, matches existing design

# Reference

@src/app/page.tsx:

- Home orchestrator: anonymous session refresh, redirect handling, intent processing (journal/appointment/assessmentResult)
- Adapt: port intent processing to Go; anonymous session handled by auth middleware

@src/app/home-content.tsx:

- Role dispatcher: reads authState.role_name, renders guest/patient/clinician component
- Reimplement: same role dispatch in Go handler based on session Role field

@src/app/home-header.tsx:

- Header with greeting, avatar, upcoming appointments/sessions fetch
- Reimplement: same greeting logic and upcoming data fetching in Go

@src/app/home-content-guest.tsx:

- Guest home: blurred chart, AppMenu, PopularAssessment, Community
- Replace: merged with patient content; guest sees same cards, booking triggers login

@src/app/home-content-patient.tsx:

- Patient home: mood chart, AppMenu, PopularAssessment, record summary carousel, Community
- Replace: primary content becomes recommendation cards (M017); secondaries kept

@src/app/home-content-clinician.tsx:

- Clinician home: handled sessions chart, exercise links, SOAP card, browse instruments, Community
- Replace: entire page becomes unified calendar (M018) + quick-action cards below

@src/components/icons/house-icon.tsx:

- HouseIcon — used for Home nav tab
- Reimplement: inline SVG in base.templ

@public/icons/ (nav + header icons):

- message-square-chat.svg (header chat — removed in M013)
- bell-alt.svg (header notifications)

# Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                                |
| ---------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------- |
| Missing FHIR data causes empty home page | Medium     | Medium | Handle empty states in templates; show skeleton or "no data" message      |
| Role detection differs from Next.js      | Low        | High   | SuperTokens session cookie contains role_name — use same field as Next.js |
| Mobile nav behaves differently           | Low        | Medium | Match existing Alpine.js patterns; test on mobile viewport                |

# UAT

1. Visit `/` as guest — see recommendation cards; clicking "Book" redirects to login
2. Login as patient — same cards visible; clicking "Book" proceeds to booking flow
3. Patient cards show last-used specialty; if none, show popular specialties
4. Login as practitioner — home shows unified calendar with today's schedule
5. Login as clinic admin — home shows operational overview with context switcher
6. On mobile viewport — hamburger menu toggles nav via Alpine.js
