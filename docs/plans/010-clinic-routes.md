---
title: Clinic Routes Migration
description: Listing, management, clinic context switcher
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for current route patterns.

Migrate `/clinic*` routes from Next.js to Go SSR. Patient-facing clinic
listing and detail, admin-facing clinic management dashboard, and
clinic context switcher for multi-clinic administrators (ADR-009).

# Goals

- `GET /clinic` lists clinics (patient view) with search
- `GET /clinic/:id` shows clinic detail with services and practitioners
- `GET /clinic/manage` shows admin dashboard for selected clinic context
- Clinic context switcher partial for multi-clinic admins
- FHIR: Organization, HealthcareService, PractitionerRole

# Implementation Steps

- [ ] Create `internal/service/clinic.go` — list, get by ID, get practitioners, get services
- [ ] Add FHIR types for Organization to `internal/fhir/types.go`
- [ ] Create `web/template/pages/clinic/list.templ` — clinic card grid
- [ ] Create `web/template/pages/clinic/detail.templ` — clinic info + services + practitioners
- [ ] Create `web/template/pages/clinic/manage.templ` — admin dashboard
- [ ] Create `web/template/partials/clinic/context-switcher.templ` — dropdown partial
- [ ] Create `internal/handler/clinic.go` — list/detail/manage handlers
- [ ] Register routes: `GET /clinic`, `GET /clinic/:id`, `GET /clinic/manage`
- [ ] Write `internal/service/clinic_test.go` — mock FHIR, test clinic data aggregation

# Reference

@src/app/clinic/page.tsx:

- Clinic listing: searchable with city filter
- Reimplement: same layout with HTMX search/filter partials

@src/app/clinic/clinic-filter.tsx:

- Clinic filter UI: city dropdown, name search
- Adapt: HTMX partial replaces React state-driven filter

@src/app/clinic/[clinicId]/page.tsx:

- Clinic detail: practitioners list with roles, organization info
- Reimplement: same data layout in templ

@src/services/clinic.tsx:

- Clinic API: useListClinics, useClinicById (practitioners with roles), useDetailPractitioner
- Reimplement: same FHIR queries (Organization + PractitionerRole includes)

@src/types/organization.ts:

- IOrganizationResource, IOrganizationDetail, IPractitioner, IDetailInvoice
- Reimplement: same fields as Go structs

@src/components/icons/office-icon.tsx:

- OfficeIcon — Appointment nav tab (maps to /clinic for practitioners)
- Reimplement: inline SVG in base.templ

@public/icons/hospital.svg, @public/icons/location.svg:

- Clinic display icons
- Reimplement: static assets from web/static/

# Risks

| Risk                                          | Likelihood | Impact | Mitigation                                                     |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| Clinic context selection lost on HTMX request | Medium     | Medium | Store active clinic in cookie; read on every request           |
| Cross-clinic admin sees wrong clinic data     | Low        | High   | Verify active clinic cookie belongs to admin's managed clinics |

# UAT

1. Visit `/clinic` as patient — clinic list shown
2. Click clinic — detail page shows services and practitioners
3. Login as multi-clinic admin — clinic switcher appears in nav
4. Switch clinic context — management dashboard updates to selected clinic
