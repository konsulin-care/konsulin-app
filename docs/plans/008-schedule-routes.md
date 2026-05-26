---
title: Schedule Routes Migration
description: Appointment list, booking via HTMX, dynamic intervals
date: 2026-05-26
---

# Overview

Migrate `/schedule*` routes from Next.js to Go SSR. Appointment list,
detail view, booking form with dynamic interval computation (ADR-004),
and HTMX partial updates for appointment status changes.

# Goals

- `GET /schedule` lists appointments with HTMX pagination
- `GET /schedule/:id` shows appointment detail
- `GET /schedule/book` renders booking form with available slots
- `POST /schedule/book` validates and creates appointment via FHIR
- Dynamic slot computation (continuous availability, not fixed slots)
- HTMX partials for status transitions (confirmed → completed)

# Implementation Steps

- [ ] Create `internal/service/schedule.go` — list appointments, compute intervals, book
- [ ] Create `internal/fhir/types.go` — Appointment, Slot Go structs with FHIR R4 tags
- [ ] Create `internal/fhir/client.go` — FHIR HTTP client with base URL and auth forwarding
- [ ] Create `web/template/pages/schedule/list.templ` — appointment list with HTMX load-more
- [ ] Create `web/template/pages/schedule/detail.templ` — appointment detail
- [ ] Create `web/template/pages/schedule/book.templ` — booking form with slot selection
- [ ] Create `web/template/partials/schedule/` — status badge, slot picker, time-range partials
- [ ] Create `internal/handler/schedule.go` — list/detail/book handlers
- [ ] Register routes: `GET /schedule`, `GET /schedule/:id`, `GET /schedule/book`, `POST /schedule/book`
- [ ] Write `internal/service/schedule_test.go` — mock FHIR, test interval computation and booking logic

# Reference

@src/app/schedule/page.tsx:

- Main schedule: role-based dispatch to patient-schedule or practitioner-schedule
- Reimplement: same role dispatch in Go handler

@src/app/schedule/patient-schedule.tsx:

- Patient schedule: lists upcoming appointments with FHIR includes
- Reimplement: same data display with HTMX pagination

@src/app/schedule/practitioner-schedule.tsx:

- Practitioner schedule: lists sessions, filterable
- Reimplement: same data with HTMX filter partials

@src/services/api/appointments.tsx:

- Appointment API: upcoming/list/book/pay for patients and practitioners
- Reimplement: same FHIR queries with \_include=PractitionerRole,Practitioner,Slot,Patient

@src/services/api/schedule.ts:

- Schedule mgmt: mark unavailability, update PractitionerRole availability
- Reimplement: same endpoints in Go service

@src/utils/availability.ts:

- Availability utilities: day index conversion, FHIR availableTime parsing/formatting
- Reimplement: same logic in Go (framework-agnostic, direct translation)

@src/types/appointment.ts:

- MergedAppointment, MergedSession types (flattened FHIR views)
- Reimplement: same fields as Go structs

@src/types/schedule.ts:

- MarkUnavailabilityRequest/Response, conflict types
- Reimplement: same fields as Go structs

@src/components/icons/office-icon.tsx:

- OfficeIcon — used for Appointment nav tab (maps to /schedule for patients)
- Reimplement: inline SVG in base.templ

@public/icons/calendar.svg, @public/icons/calendar-profile.svg:

- Schedule display icons
- Reimplement: static assets from web/static/

# Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                                  |
| ---------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Dynamic interval computation too slow    | Medium     | Medium | Cache practitioner schedule data; compute on request with timeout           |
| Double-booking race condition            | Low        | High   | Backend FHIR server enforces scheduling constraints; Go SSR is display-only |
| Large appointment list overwhelms mobile | Low        | Medium | Paginate with `_count` param; HTMX loads next page on scroll                |

# UAT

1. Visit `/schedule` — appointment list loads with pagination
2. Click appointment — detail view shows full info
3. Click "Book" — form shows available slots from interval computation
4. Submit booking — appointment appears in list
5. Scroll down — next page loads via HTMX
