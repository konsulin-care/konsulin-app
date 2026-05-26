---
title: Unified Practitioner Calendar
description: Cross-clinic calendar view with color coding
date: 2026-05-26
---

# Overview

Implement the unified practitioner calendar (ADR-005). The calendar
REPLACES the current practitioner dashboard (`HomeContentClinician`).
When role is `Practitioner`, `GET /` renders the calendar as primary
content. Calendar aggregates all appointments across clinics, with
color coding by clinic context. HTMX handles date navigation.

# Goals

- `GET /` for Practitioner role renders unified calendar as primary content
- Calendar shows today's schedule by default, with week navigation via HTMX
- Appointments from all clinics aggregated into one timeline
- Color-coded by clinic (configurable color per clinic)
- HTMX date navigation (prev/next/today) without full reload
- Below calendar: quick-action cards (Create SOAP, Today's Patients, Pending SOAPs)
- Click appointment → detail view or edit
- Practitioner dashboard becomes calendar-first, timeline-first (ADR-005)

# Implementation Steps

- [ ] Create `internal/service/calendar.go` — aggregate appointments across clinics, group by date
- [ ] Create `web/template/pages/calendar/view.templ` — calendar grid with day/week toggle
- [ ] Create `web/template/partials/calendar/day.templ` — day column with appointment items
- [ ] Create `web/template/partials/calendar/appointment.templ` — single appointment with clinic color
- [ ] Create `internal/handler/home.go` (practitioner branch) — dispatches to calendar component
- [ ] Create `internal/handler/calendar.go` — calendar data handler, HTMX partial for navigation
- [ ] Create `web/template/pages/calendar/quick-actions.templ` — SOAP, patient list, stats cards
- [ ] Register routes: `GET /` (practitioner → calendar), `GET /partials/calendar/week`
- [ ] Wire practitioner role detection in home handler to serve calendar
- [ ] Write `internal/service/calendar_test.go` — mock appointments across clinics, test aggregation

# Reference

@src/app/home-content-clinician.tsx:

- Current clinician dashboard (to be REPLACED)
- Remove: handled sessions chart, exercise links, browse instruments
- Keep: SOAP quick-link card (moved to calendar quick-actions section)

@src/services/api/appointments.tsx:

- Session hooks: useGetAllSessions, useGetTodaySessions, useGetUpcomingSessions
- Reimplement: same FHIR Appointment queries with clinic context filtering
- Keep: \_include=Patient,Slot for enriched appointment data

@src/app/practitioner/practitioner-availability.tsx:

- Slot/availability display: calendar date navigation, slot rendering
- Adapt: reuse slot display logic for calendar day cells

@src/components/icons/office-icon.tsx:

- OfficeIcon — maps to / (calendar) for practitioners
- Reimplement: inline SVG in base.templ

@public/icons/calendar.svg:

- Calendar display icon
- Reimplement: static asset from web/static/

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                   |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Large number of appointments slow to render | Medium     | Medium | Limit view to one week; paginate within week if needed       |
| Clinic color mapping not memorable          | Low        | Low    | Allow practitioners to customize clinic colors in settings   |
| Role detection routes to wrong home variant | Low        | High   | Use same role_name field from SuperTokens session as Next.js |

# UAT

1. Login as practitioner with appointments in 2+ clinics
2. Visit `/` — unified calendar shows today's schedule across all clinics
3. Appointments color-coded by clinic (configurable)
4. Below calendar: quick-action cards (Create SOAP, Today's Patients)
5. Click "Next Week" — calendar updates via HTMX without full reload
6. Click appointment — detail view opens
7. Click "Today" — calendar returns to current day
8. Switch role to patient — home shows recommendation cards instead
