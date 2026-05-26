---
title: Recommendation Engine
description: FHIR aggregation, proximity, specialty modal, booking
date: 2026-05-26
---

# Overview

Implement the recommendation-first patient UX (ADR-003, ADR-006). The
Go SSR aggregates FHIR resources (PractitionerRole → HealthcareService →
Location), ranks by nearest availability + proximity, and provides a
booking flow from curated recommendation cards.

Intent params: `specialty` (required), `modality` (optional: online/offline),
`lat` (optional), `lon` (optional). lat/lon come from external service
(e.g., WhatsApp link); use FHIR `?near` search param on Location for
proximity. No custom distance calculation.

When no intent params, show a specialty picker modal (required) with
optional modality filter. Specialty and modality also available as
inline filters on the results page.

# Goals

- `GET /recommendations` accepts `specialty` (required), `modality`, `lat`, `lon`
- Specialty picker modal when no params provided
- Inline filters for specialty and modality on results page
- Aggregates PractitionerRole → HealthcareService → Location (FHIR `?near` for proximity)
- Ranks by nearest availability + proximity
- Renders recommendation cards: practitioner, service, fee, next slot, distance badge
- Booking flow: card → select slot → confirm → appointment created
- Guest redirected to login on booking; patient books directly
- Pricing composition: `base_fee + practitioner_adjustment + system_adjustment` (ADR-007)

# Implementation Steps

- [ ] Create `internal/service/recommendation.go` — parse intent params, aggregate FHIR, rank
- [ ] Create `internal/service/pricing.go` — fee composition logic (ADR-007)
- [ ] Add FHIR `Location` type to `internal/fhir/types.go`
- [ ] Add FHIR `HealthcareService` type to `internal/fhir/types.go`
- [ ] Fetch Location resources via `GET /Location?near={lat}|{lon}|{distance}` for proximity filtering
- [ ] Link Location → HealthcareService → PractitionerRole for recommendation pipeline
- [ ] Create `web/template/pages/recommendation/list.templ` — results grid with inline filters
- [ ] Create `web/template/pages/recommendation/specialty-modal.templ` — modal for specialty (required) + modality (optional)
- [ ] Create `web/template/partials/recommendation/card.templ` — card with practitioner, fee, slot, distance
- [ ] Create `web/template/pages/recommendation/book.templ` — slot selection → confirm flow
- [ ] Create `internal/handler/recommendation.go` — list/modal/book handlers
- [ ] Register routes: `GET /recommendations`, `POST /recommendations/search`, `GET /recommendations/book`, `POST /recommendations/book`
- [ ] When no `specialty` param → serve specialty-modal page
- [ ] Write `internal/service/recommendation_test.go` — mock FHIR, test ranking with proximity + slot availability

# Reference

@src/utils/intent-storage.ts:

- Intent pattern: save intent before action, restore after auth
- Adapt: recommendation booking uses same intent pattern for guest → login → book flow

@src/app/practitioner/practitioner-availability.tsx:

- Booking flow: calendar → slot picker → condition → payment
- Adapt: recommendation booking reuses slot selection and payment flow from this component

@src/types/availability.ts:

- Availability types: DayOfWeek, TimeRange, WeeklyAvailability
- Reimplement: same types in Go for slot computation

@src/services/api/appointments.tsx:

- Appointment creation: useCreateAppointment (POST FHIR Bundle), usePayAppointment
- Reimplement: same FHIR Bundle booking pattern in Go

@src/services/clinic.tsx:

- Practitioner/HealthcareService query: useDetailPractitioner, useClinicById
- Adapt: expand to include Location resource with `?near` spatial search

(No existing recommendation engine in Next.js — this is a new feature.)

# Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                                    |
| ---------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------- |
| FHIR aggregation too slow (multiple resources) | High       | High   | Parallelize FHIR fetches with errgroup; cache stable resources (Organization) |
| No lat/lon on Location resources               | Medium     | Medium | Fall back to availability-only ranking                                        |
| Specialty param missing — redirect to modal    | Low        | Low    | Specialty required; modal ensures user specifies before results               |
| No Location resources with coordinates         | Medium     | Medium | Fall back to city/district-level name matching                                |

# UAT

1. Visit `/recommendations?specialty=neurology` — ranked cards shown for neurology practitioners
2. Visit `/recommendations?specialty=neurology&modality=online&lat=-6.2&lon=106.8` — filtered by online modality + proximity
3. Visit `/recommendations` with no params — specialty picker modal appears
4. Select specialty (required) and optionally modality → results load
5. Card shows practitioner name, specialty, nearest slot, final fee, distance badge
6. Use inline filter to change specialty or modality — results update via HTMX
7. Click "Book" as patient — select slot → confirm → appointment created
8. Click "Book" as guest — redirected to login; booking resumes after auth
