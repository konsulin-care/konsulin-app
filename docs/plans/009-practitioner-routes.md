---
title: Practitioner Pages — React SPA
description: Practitioner profiles, availability, HealthcareService — React Query
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route patterns and @docs/wiki/006-data-types.md for FHIR type definitions.

Rewrite `/practitioner/*` as Next.js React SPA pages. Practitioner
listing with search/filter, detailed profile with HealthcareServices,
and availability view — all via React Query through `/proxy/fhir/*`.
No Go SSR. Aligned with ADR-015.

# Goals

- `GET /practitioner` — card grid with search and specialty filter (React state + `useQuery`)
- `GET /practitioner/:id` — detailed profile with services via `useQuery`
- `GET /practitioner/:id/availability` — weekly availability schedule
- FHIR resources: Practitioner, PractitionerRole, HealthcareService
- Filter/search via React state (debounced input + query param change)

# Implementation Steps

- [ ] Create `src/app/practitioner/page.tsx` — card grid with search bar and specialty filter
- [ ] Create `src/app/practitioner/[practitionerId]/page.tsx` — profile with service list
- [ ] Create `src/app/practitioner/[practitionerId]/availability/page.tsx` — weekly availability view
- [ ] Add React Query hooks: `usePractitioners(search, specialty)`, `usePractitionerDetail(id)`, `usePractitionerAvailability(id)`
- [ ] Filter state managed via React state + URL search params; debounced input triggers refetch
- [ ] Write `src/app/practitioner/__tests__/practitioner.test.tsx` — mock fetch, test search and detail flow

# Reference

@src/app/practitioner/[practitionerId]/page.tsx:

- Practitioner detail: avatar, organization badge, availability, specialties, booking flow
- Keep: same layout and data in React
- Keep: same FHIR includes (PractitionerRole, Organization, Practitioner, Invoice, Schedule)

@src/app/practitioner/practitioner-availability.tsx:

- Availability display: calendar + time slot picker + booking flow
- Keep: slot picker and booking logic in React

@src/app/practitioner/practitioner-availability-editor.tsx:

- Availability editor: add/remove time ranges per day per organization
- Keep: same editor UI in React

@src/services/clinicians.tsx:

- Clinician API: findAvailability, getPractitionerRolesDetail, updatePractitionerInfo, create/update Invoice
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@src/types/practitioner.ts:

- IPractitionerRoleDetail (enriched with organization, schedule, invoice data)
- Keep: same enriched TypeScript type

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                  |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------------- |
| N+1 queries for PractitionerRole references | High       | High   | Use `_include=PractitionerRole:practitioner` in FHIR search |
| Large practitioner list slow on mobile      | Low        | Medium | Paginate with `_count=20`; lazy-load next page on scroll    |

# UAT

1. Visit `/practitioner` — list loads with search bar
2. Type in search — results filter via debounced refetch
3. Click practitioner — profile shows services and specialties
4. Click "View Availability" — weekly schedule shown
