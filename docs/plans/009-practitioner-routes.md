---
title: Practitioner Routes Migration
description: Profiles, availability, HealthcareService
date: 2026-05-26
---

# Overview

Migrate `/practitioner/*` routes from Next.js to Go SSR. Practitioner
listing with search/filter, detailed profile with HealthcareServices,
and availability view.

# Goals

- `GET /practitioner` lists practitioners with search and specialty filter
- `GET /practitioner/:id` shows detailed profile with services
- `GET /practitioner/:id/availability` shows availability schedule
- FHIR resources: Practitioner, PractitionerRole, HealthcareService
- HTMX partials for filter/search without full page reload

# Implementation Steps

- [ ] Create `internal/service/practitioner.go` — search, get by ID, get services, get availability
- [ ] Add FHIR types for Practitioner, PractitionerRole, HealthcareService to `internal/fhir/types.go`
- [ ] Create `web/template/pages/practitioner/list.templ` — card grid with search
- [ ] Create `web/template/pages/practitioner/detail.templ` — profile with service list
- [ ] Create `web/template/pages/practitioner/availability.templ` — weekly availability view
- [ ] Create `web/template/partials/practitioner/` — search-bar, card, service-item partials
- [ ] Create `internal/handler/practitioner.go` — list/detail/availability handlers
- [ ] Register routes: `GET /practitioner`, `GET /practitioner/:id`, `GET /practitioner/:id/availability`
- [ ] Write `internal/service/practitioner_test.go` — mock FHIR, test search and detail fetching

# Reference

@src/app/practitioner/[practitionerId]/page.tsx:

- Practitioner detail: avatar, organization badge, availability, specialties, booking flow
- Reimplement: same layout and data in templ
- Keep: same FHIR includes (PractitionerRole, Organization, Practitioner, Invoice, Schedule)

@src/app/practitioner/practitioner-availability.tsx:

- Availability display: calendar + time slot picker + booking flow
- Adapt: slot picker and booking logic ported to Go + HTMX

@src/app/practitioner/practitioner-availability-editor.tsx:

- Availability editor: add/remove time ranges per day per organization
- Reimplement: same editor UI with Alpine.js for dynamic range management

@src/services/clinicians.tsx:

- Clinician API: findAvailability, getPractitionerRolesDetail, updatePractitionerInfo, create/update Invoice
- Reimplement: same FHIR queries in Go service layer

@src/types/practitioner.ts:

- IPractitionerRoleDetail (enriched with organization, schedule, invoice data)
- Reimplement: same enriched struct in Go

@src/components/icons/office-icon.tsx:

- OfficeIcon — Appointment nav tab (maps to /practitioner for patients browsing practitioners)
- Reimplement: inline SVG in base.templ

@public/icons/calendar-edit.png:

- Used in practitioner booking UI
- Reimplement: static asset from web/static/

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                  |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------------- |
| N+1 queries for PractitionerRole references | High       | High   | Use `_include=PractitionerRole:practitioner` in FHIR search |
| Large practitioner list slow on mobile      | Low        | Medium | Paginate with `_count=20`; HTMX lazy-load next page         |

# UAT

1. Visit `/practitioner` — list loads with search bar
2. Type in search — results filter via HTMX
3. Click practitioner — profile shows services and specialties
4. Click "View Availability" — weekly schedule shown
