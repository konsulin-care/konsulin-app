---
title: Recommendation Engine
description: FHIR aggregation via BFF endpoint, React UI, ranking
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/003-api-services.md for current API patterns and @docs/wiki/006-data-types.md for FHIR type definitions.

Implement the recommendation-first patient UX (ADR-003, ADR-006). A
dedicated Go BFF `/api/recommendations` endpoint aggregates FHIR
resources (PractitionerRole → HealthcareService → Location) server-side,
ranks by nearest availability + proximity, and returns a pre-joined JSON
payload. React Query fetches this endpoint and renders recommendation
cards. No Go SSR. Aligned with ADR-015.

Intent params: `specialty` (required), `modality` (optional: online/offline),
`lat` (optional), `lon` (optional). lat/lon come from external service
(e.g., WhatsApp link); use FHIR `?near` search param on Location for
proximity. No custom distance calculation.

When no intent params, show a specialty picker modal (required) with
optional modality filter. Specialty and modality also available as
inline filters on the results page.

# Goals

- Go BFF `GET /api/recommendations?specialty=...` — FHIR aggregation server-side
- React page `GET /recommendations` — fetches from BFF endpoint, renders cards
- Specialty picker modal when no params provided (React modal)
- Inline filters for specialty and modality (React state)
- Ranking by nearest availability + proximity (Go BFF does the heavy work)
- Recommendation cards: practitioner, service, fee, next slot, distance badge
- Booking flow: card → select slot → confirm → appointment created
- Guest redirected to login on booking; patient books directly
- Pricing composition: `base_fee + practitioner_adjustment + system_adjustment` (ADR-007)

# Implementation Steps

## Go BFF Side

- [ ] Create `internal/handler/api/recommendations.go` — `GET /api/recommendations` handler
- [ ] Create `internal/service/recommendation.go` — aggregate FHIR: PractitionerRole → HealthcareService → Location
- [ ] Create `internal/service/pricing.go` — fee composition logic (ADR-007)
- [ ] Parallel fetch PractitionerRole, HealthcareService, Location via errgroup
- [ ] Use FHIR `?near` search on Location for proximity filtering
- [ ] Rank results: nearest availability first, then proximity, then fee
- [ ] Return pre-joined JSON payload (no HTML rendering in Go)

## React Side

- [ ] Create `src/app/recommendations/page.tsx` — results page; fetches via `useQuery('/api/recommendations', params)`
- [ ] Create specialty-picker modal component — required specialty + optional modality selection
- [ ] Create inline filter components — specialty + modality dropdowns trigger refetch
- [ ] Create recommendation card component — practitioner name, specialty, fee, next slot, distance badge
- [ ] Create booking flow page — card → select slot → confirm → `useMutation` creates appointment
- [ ] Guest redirect: detect unauthenticated, save intent to localStorage, redirect to login, restore after auth
- [ ] Write `src/app/recommendations/__tests__/recommendations.test.tsx` — mock BFF endpoint, test card rendering and booking

# Reference

@src/utils/intent-storage.ts:

- Intent pattern: save intent before action, restore after auth
- Keep: recommendation booking uses same intent pattern for guest → login → book

@src/app/practitioner/practitioner-availability.tsx:

- Booking flow: calendar → slot picker → condition → payment
- Adapt: recommendation booking reuses slot selection and payment flow

@src/types/availability.ts:

- Availability types: DayOfWeek, TimeRange, WeeklyAvailability
- Keep: same TypeScript types for slot computation

@src/services/api/appointments.tsx:

- Appointment creation: useCreateAppointment (POST FHIR Bundle), usePayAppointment
- Keep: same FHIR Bundle booking pattern via React Query

@src/services/clinic.tsx:

- Practitioner/HealthcareService query
- Adapt: replace direct FHIR calls with BFF `/api/recommendations` endpoint

# Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                                   |
| ---------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------- |
| FHIR aggregation too slow (multiple resources) | High       | High   | Parallelize server-side with errgroup; cache stable resources (Organization) |
| No lat/lon on Location resources               | Medium     | Medium | Fall back to availability-only ranking                                       |
| Specialty param missing — redirect to modal    | Low        | Low    | Specialty required; modal ensures user specifies before results              |
| No Location resources with coordinates         | Medium     | Medium | Fall back to city/district-level name matching                               |
| BFF endpoint becomes bottleneck                | Low        | Medium | Cache pre-aggregated results for popular specialties with short TTL          |

# UAT

1. Visit `/recommendations?specialty=neurology` — ranked cards shown for neurology practitioners
2. Visit `/recommendations?specialty=neurology&modality=online&lat=-6.2&lon=106.8` — filtered by online modality + proximity
3. Visit `/recommendations` with no params — specialty picker modal appears
4. Select specialty (required) and optionally modality → results load
5. Card shows practitioner name, specialty, nearest slot, final fee, distance badge
6. Use inline filter to change specialty or modality — results update via refetch
7. Click "Book" as patient — select slot → confirm → appointment created
8. Click "Book" as guest — redirected to login; booking resumes after auth
