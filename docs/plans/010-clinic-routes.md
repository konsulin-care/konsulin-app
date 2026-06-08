---
title: Clinic Pages — React SPA
description: Clinic listing, management, context — React Query + React Context
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for current route patterns.

Rewrite `/clinic*` as Next.js React SPA pages. Patient-facing clinic
listing and detail, admin-facing clinic management dashboard, and
clinic context switcher for multi-clinic administrators (ADR-009).
Active clinic context stored client-side in React Context and synced
to server cookie via fetch POST. Aligned with ADR-015.

# Goals

- `GET /clinic` — clinic listing with search (React state + `useQuery`)
- `GET /clinic/:id` — clinic detail with services and practitioners
- `GET /clinic/manage` — admin dashboard for selected clinic context
- Clinic context switcher — React component + React Context provider + cookie sync
- FHIR: Organization, HealthcareService, PractitionerRole

# Implementation Steps

- [ ] Create `src/app/clinic/page.tsx` — clinic card grid with search
- [ ] Create `src/app/clinic/[clinicId]/page.tsx` — clinic info + services + practitioners
- [ ] Create `src/app/clinic/manage/page.tsx` — admin dashboard (practitioner counts, pending approvals)
- [ ] Create `src/contexts/ClinicContext.tsx` — React context for active clinic ID
- [ ] Create clinic context switcher component — dropdown dispatches `POST /context/clinic` to set cookie, updates React context
- [ ] Add React Query hooks: `useClinics(search)`, `useClinicDetail(id)`, `useClinicManagement(id)`
- [ ] Write `src/app/clinic/__tests__/clinic.test.tsx` — mock fetch, test detail and context switch

# Reference

@src/app/clinic/page.tsx:

- Clinic listing: searchable with city filter
- Keep: same layout with React state for search/filter

@src/app/clinic/clinic-filter.tsx:

- Clinic filter UI: city dropdown, name search
- Keep: React component; replace fetch with `useQuery('/proxy/fhir/Organization')`

@src/app/clinic/[clinicId]/page.tsx:

- Clinic detail: practitioners list with roles, organization info
- Keep: same data layout in React

@src/services/clinic.tsx:

- Clinic API: useListClinics, useClinicById (practitioners with roles), useDetailPractitioner
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@src/types/organization.ts:

- IOrganizationResource, IOrganizationDetail, IPractitioner, IDetailInvoice
- Keep: same TypeScript types

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                     |
| ------------------------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| Clinic context desynced across browser tabs | Medium     | Medium | Sync via cookie; when cookie changes, update React context     |
| Cross-clinic admin sees wrong clinic data   | Low        | High   | Verify active clinic cookie belongs to admin's managed clinics |

# UAT

1. Visit `/clinic` as patient — clinic list shown
2. Click clinic — detail page shows services and practitioners
3. Login as multi-clinic admin — clinic switcher appears in nav
4. Switch clinic context — management dashboard updates to selected clinic
