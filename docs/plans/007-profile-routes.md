---
title: Profile Routes Migration
description: View/edit profile, FHIR Patient/Practitioner
date: 2026-05-26
---

# Overview

Migrate `/profile*` routes from Next.js to Go SSR. View profile, edit
profile form with HTMX validation, and FHIR resource loading for
Patient (patient role) or Practitioner (practitioner role) resources.

# Goals

- `GET /profile` displays user profile from FHIR Patient/Practitioner
- `GET /profile/edit` renders edit form with current values
- `POST /profile/edit` validates via HTMX, saves to FHIR backend
- Role-aware: patients edit Patient resource, practitioners edit Practitioner
- Profile completeness check redirects to edit if incomplete

# Implementation Steps

- [ ] Create `internal/service/profile.go` — fetch/update Patient or Practitioner from FHIR
- [ ] Create `web/template/pages/profile/view.templ` — profile display
- [ ] Create `web/template/pages/profile/edit.templ` — edit form with HTMX validation
- [ ] Create `web/template/partials/profile/form-field.templ` — reusable form field partial
- [ ] Create `internal/handler/profile.go` — view/edit handlers with session context
- [ ] Register routes: `GET /profile`, `GET /profile/edit`, `POST /profile/edit`
- [ ] Write `internal/service/profile_test.go` — mock FHIR client, test fetch/update
- [ ] Write `internal/handler/profile_test.go` — test view/edit with various session states

# Reference

@src/app/profile/page.tsx:

- Main profile page: role-based dispatch to clinician or patient profile
- Reimplement: same role-aware dispatch in Go handler

@src/app/profile/patient.tsx:

- Patient profile: displays and edits Patient FHIR resource fields
- Reimplement: same form fields in templ + HTMX validation

@src/app/profile/clinician.tsx:

- Clinician profile: Practitioner resource fields, weekly availability editor
- Reimplement: same fields + Alpine.js availability editor

@src/app/profile/utils/index.ts:

- Availability form utilities: validateTimeRanges, convertToFhirAvailableTimeForOrganization
- Reimplement: same validation + FHIR conversion logic in Go

@src/services/profile.tsx:

- Profile service: createProfile, getProfileByIdentifier, getProfileById, updateProfile
- Reimplement: same FHIR endpoints (Patient, Practitioner) in Go service layer

@src/components/icons/user-icon.tsx:

- UserIcon — used for Profile nav tab
- Reimplement: inline SVG in base.templ

@public/icons/user.svg, @public/icons/user-edit.svg:

- Profile display/editing icons
- Reimplement: static assets served from web/static/

# Risks

| Risk                                          | Likelihood | Impact | Mitigation                                                                 |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------- |
| FHIR Patient vs Practitioner mismatch         | Low        | High   | Check role in session before determining resource type                     |
| Form validation errors not displayed via HTMX | Low        | Medium | Return HTML fragments with error messages; use hx-target for inline errors |

# UAT

1. Login as patient — visit `/profile` — shows patient profile data
2. Click edit — form pre-fills with current values
3. Submit with invalid data — inline HTMX errors shown
4. Submit valid data — profile updates, view reflects changes
