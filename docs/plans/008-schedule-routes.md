---
title: Schedule Pages — React SPA
description: Appointment list, detail, free-interval computation, status transitions
date: 2026-06-30
---

# Overview

All pages render as React SPA through Go BFF proxy (ADR-015). The 3rd-party
backend (Blaze FHIR) stores non-free Slots and handles race conditions.
The frontend computes free bookable intervals by subtracting non-free Slots
from PractitionerRole.availableTime, partitioned by HealthcareService.duration
per ADR-017 (supersedes ADR-004).

Booking flow lives in practitioner context (`src/app/practitioner/`), not
under `/schedule/book`.

# Goals

- `GET /schedule` — appointment list with `useInfiniteQuery` pagination
- `GET /schedule?id=X` — appointment detail via `useQuery(appointmentId)`
- Free-interval computation module — pure function: given availableTime
  windows + non-free Slot[] + HealthcareService duration, outputs
  bookable intervals
- Status transitions (confirmed → completed) via `useUpdateAppointmentStatus`
- HealthcareService duration field added to service form drawer
- Tests for interval computation module and status hook

# Implementation Steps

## Already Done

- [x] `src/app/schedule/page.tsx` — role-dispatch list via `useAppointments`
- [x] `src/app/schedule/schedule-list.tsx` — role dispatch
- [x] `src/app/schedule/patient-schedule.tsx` — patient list + infinite query
- [x] `src/app/schedule/practitioner-schedule.tsx` — practitioner list + infinite query
- [x] `src/app/schedule/schedule-detail.tsx` — detail via `useAppointment(id)`
- [x] `src/app/schedule/session-filter.tsx` — filter UI
- [x] `src/app/schedule/__tests__/schedule.test.tsx` — SchedulePageShell tests
- [x] `src/services/hooks/useAppointments.ts` — infinite query hook
- [x] `src/services/hooks/useAppointment.ts` — single appointment hook
- [x] `src/services/api/appointments.tsx` — appointment API hooks
- [x] `src/services/api/schedule.ts` — schedule management hooks
- [x] `src/utils/availability.ts` — availability utilities
- [x] `src/types/appointment.ts`, `src/types/schedule.ts` — types
- [x] Booking flow in practitioner context (not `/schedule/book`)

## To Implement (TDD)

- [ ] ADR-017 created, ADR-004 superseded
- [ ] Free-interval computation pure function — takes availableTime, non-free
      Slots, duration, date → bookable interval array
- [ ] HealthcareService.duration extension in service form drawer
- [ ] `useUpdateAppointmentStatus` mutation hook
- [ ] Tests for interval computation module
- [ ] Tests for `useUpdateAppointmentStatus`

# Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                         |
| ---------------------------------------- | ---------- | ------ | ------------------------------------------------------------------ |
| Free-interval computation performance    | Medium     | Medium | Cache PractitionerRole availableTime; scope date range to a day    |
| Double-booking race condition            | Low        | High   | Backend FHIR server enforces scheduling constraints (ADR-017)      |
| Large appointment list overwhelms mobile | Low        | Medium | Paginate with `_count=10`; InfiniteQuery loads next page on scroll |

# UAT

1. Visit `/schedule` — appointment list loads with pagination
2. Click appointment — detail view shows full info
3. Visit practitioner profile → Book — free intervals shown based on
   HealthcareService duration, computed from availableTime minus non-free slots
4. Submit booking — appointment appears in schedule list
5. Scroll down — next page loads via infinite scroll
