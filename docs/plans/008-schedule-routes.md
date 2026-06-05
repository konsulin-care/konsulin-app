---
title: Schedule Pages — React SPA
description: Appointment list, booking, dynamic intervals — React Query
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route patterns and @docs/wiki/003-api-services.md for current API service patterns.

Rewrite `/schedule*` as Next.js React SPA pages. Appointment list,
detail, and booking use React Query through `GET /proxy/fhir/*`.
Dynamic interval computation (ADR-004) runs client-side via React Query
on availability data. No Go SSR — Go BFF is pure proxy. Aligned with ADR-015.

# Goals

- `GET /schedule` — appointment list with `useInfiniteQuery` pagination (Intersection Observer)
- `GET /schedule/:id` — appointment detail via `useQuery`
- `GET /schedule/book` — booking form with slot selection; intervals computed from availability data
- `POST /schedule/book` — create appointment via `useMutation` through proxy
- Dynamic slot computation (continuous availability, not fixed slots)
- Status transitions (confirmed → completed) via `useMutation`

# Implementation Steps

- [ ] Create `src/app/schedule/page.tsx` — role-dispatch list; `useInfiniteQuery` with `_count` and `Bundle.link[rel=next]`
- [ ] Create `src/app/schedule/[id]/page.tsx` — appointment detail via `useQuery`
- [ ] Create `src/app/schedule/book/page.tsx` — booking form; availability fetched via `useQuery`, intervals computed client-side
- [ ] Add React Query hooks: `useAppointments(role, filters)`, `useAppointment(id)`, `useCreateAppointment()`, `useUpdateAppointmentStatus()`
- [ ] Write availability interval computation as pure function (ADR-004) — input: PractitionerRole/Schedule/Slot FHIR, output: time slot array
- [ ] Write `src/app/schedule/__tests__/schedule.test.tsx` — mock fetch, test pagination and booking flow

# Reference

@src/app/schedule/page.tsx:

- Main schedule: role-based dispatch to patient-schedule or practitioner-schedule
- Keep: same role dispatch in React SPA
- Adapt: replace fetch with `useInfiniteQuery('/proxy/fhir/Appointment', ...)`

@src/app/schedule/patient-schedule.tsx:

- Patient schedule: lists upcoming appointments with FHIR includes
- Keep: same data display with `useInfiniteQuery` instead of manual pagination

@src/app/schedule/practitioner-schedule.tsx:

- Practitioner schedule: lists sessions, filterable
- Keep: same data with React state filters

@src/services/api/appointments.tsx:

- Appointment API: upcoming/list/book/pay for patients and practitioners
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@src/services/api/schedule.ts:

- Schedule mgmt: mark unavailability, update PractitionerRole availability
- Adapt: same endpoints via `/proxy/fhir/`

@src/utils/availability.ts:

- Availability utilities: day index conversion, FHIR availableTime parsing/formatting
- Keep: same logic as framework-agnostic pure functions

@src/types/appointment.ts:

- MergedAppointment, MergedSession types (flattened FHIR views)
- Keep: same TypeScript types

# Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                           |
| ---------------------------------------- | ---------- | ------ | -------------------------------------------------------------------- |
| Dynamic interval computation too slow    | Medium     | Medium | Cache practitioner schedule data client-side; compute on demand      |
| Double-booking race condition            | Low        | High   | Backend FHIR server enforces scheduling constraints; Go BFF is proxy |
| Large appointment list overwhelms mobile | Low        | Medium | Paginate with `_count=10`; InfiniteQuery loads next page on scroll   |

# UAT

1. Visit `/schedule` — appointment list loads with pagination
2. Click appointment — detail view shows full info
3. Click "Book" — form shows available slots from interval computation
4. Submit booking — appointment appears in list
5. Scroll down — next page loads via infinite scroll
