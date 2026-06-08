---
title: Unified Practitioner Calendar
description: Cross-clinic calendar view — React component
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for current route patterns and clinician dashboard layout.

Implement the unified practitioner calendar (ADR-005) as a React
component. The calendar REPLACES the current practitioner dashboard
(`HomeContentClinician`). When role is `Practitioner`, `GET /` renders
the calendar as primary content. Calendar aggregates all appointments
across clinics, with color coding by clinic context. Date navigation
via React state. No Go SSR, no HTMX. Aligned with ADR-015.

# Goals

- `GET /` for Practitioner role renders unified calendar as primary content
- Calendar shows today's schedule by default, with week navigation via React state
- Appointments from all clinics aggregated into one timeline
- Color-coded by clinic (configurable color per clinic)
- Date navigation (prev/next/today) via React state + `useQuery` refetch
- Below calendar: quick-action cards (Create SOAP, Today's Patients, Pending SOAPs)
- Click appointment → detail view or edit
- Practitioner dashboard becomes calendar-first, timeline-first (ADR-005)

# Implementation Steps

- [ ] Create calendar component at `src/components/calendar/unified-calendar.tsx`
- [ ] Fetch appointments via `useQuery` with date range params through `/proxy/fhir/Appointment`
- [ ] Aggregation: fetch appointments across all clinics (use Practitioner's PractitionerRole to determine clinic list)
- [ ] Color code: map clinic ID to color via `useQuery('/proxy/fhir/Organization')` or config
- [ ] Date navigation: `currentWeek` state, prev/next buttons trigger refetch with new date params
- [ ] Create quick-action card components: Create SOAP (`/assessments/soap`), Today's Patients, Pending SOAPs
- [ ] Create appointment detail component (click → inline detail or navigate to `/schedule/{id}`)
- [ ] Update `src/app/page.tsx` — practitioner role dispatches to calendar instead of old dashboard
- [ ] Write `src/components/calendar/__tests__/unified-calendar.test.tsx` — mock appointments, test aggregation and navigation

# Reference

@src/app/home-content-clinician.tsx:

- Current clinician dashboard (to be REPLACED)
- Remove: handled sessions chart, exercise links, browse instruments
- Keep: SOAP quick-link card (moved to calendar quick-actions section)

@src/services/api/appointments.tsx:

- Session hooks: useGetAllSessions, useGetTodaySessions, useGetUpcomingSessions
- Adapt: same FHIR Appointment queries with date+clinic params, via React Query through `/proxy/fhir/`

@src/app/practitioner/practitioner-availability.tsx:

- Slot/availability display: calendar date navigation, slot rendering
- Adapt: reuse slot display logic for calendar day cells

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                   |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Large number of appointments slow to render | Medium     | Medium | Limit view to one week; virtualize day rows if needed        |
| Clinic color mapping not memorable          | Low        | Low    | Allow practitioners to customize clinic colors in settings   |
| Role detection routes to wrong home variant | Low        | High   | Use same role_name field from SuperTokens session as Next.js |

# UAT

1. Login as practitioner with appointments in 2+ clinics
2. Visit `/` — unified calendar shows today's schedule across all clinics
3. Appointments color-coded by clinic (configurable)
4. Below calendar: quick-action cards (Create SOAP, Today's Patients)
5. Click "Next Week" — calendar updates via state change + refetch
6. Click appointment — detail view opens
7. Click "Today" — calendar returns to current day
8. Switch role to patient — home shows recommendation cards instead
