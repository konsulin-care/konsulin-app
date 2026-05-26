---
title: Assessment SPA Shell
description: AEHRC Smart Forms React SPA in Go SSR
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/007-aehrc-forms.md for current AEHRC Smart Forms integration and SOAP flow.

Embed the AEHRC Smart Forms React SPA within the Go SSR application
(ADR-010). Go server serves shell HTML for three assessment flows:
(1) general assessment browse/fill at `/assessments`, (2) practitioner
SOAP notes at `/assessments/soap`, (3) general assessment fill with
practitioner-on-behalf at `/assessments/{id}`. The SPA bundles are
served as static assets; API calls are proxied to backend FHIR.

# Goals

- `GET /assessments` serves SPA shell — assessment browse centre
- `GET /assessments/{id}` serves SPA shell — fill questionnaire (patient or practitioner-on-behalf)
- `GET /assessments/soap` serves SPA shell — practitioner-only SOAP note creation
- Practitioner selects patient via participant dropdown (today's sessions or create new)
- SOAP uses AEHRC Smart Forms + `extractObservationBased()` to produce Observation resources
- SOAP submitted as FHIR transaction Bundle (QuestionnaireResponse + Observation[])
- Practitioner-only auth guard on `/assessments/soap`
- React SPA bundles at `web/assessment-spa/` served as static assets
- Go server proxies `/assessments/api/*` to backend FHIR
- IndexedDB-based draft persistence for offline (ADR-010)
- Terminology server URL passed from Go config to React SPA via global JS variable
- SPA build tooling (webpack/vite) integrated into `make build`

# Implementation Steps

- [ ] Scaffold `web/assessment-spa/` with React + AEHRC Smart Forms renderer
- [ ] Create three mount templates:
  - `web/template/pages/assessment/shell.templ` — general assessment
  - `web/template/pages/assessment/soap-shell.templ` — SOAP (practitioner-only)
  - `web/template/pages/assessment/fill.templ` — fill with participant selector
- [ ] Create participant-selector templ partial for practitioner-on-behalf patient selection
- [ ] Configure Go server to serve `web/assessment-spa/dist/` at `/assessment-spa/`
- [ ] Create proxy handler for `/assessments/api/*` to backend FHIR
- [ ] Register routes: `GET /assessments`, `GET /assessments/{id}`, `GET /assessments/soap`, `GET /assessment-spa/*`
- [ ] Add auth middleware check: only Practitioner role for `/assessments/soap`
- [ ] Implement SOAP submission handler — construct FHIR transaction Bundle
- [ ] Add assessment build to Makefile: `build-assessment-spa`
- [ ] Implement IndexedDB draft save/load in the React SPA
- [ ] Write tests for API proxy handler (verify path rewriting, header forwarding)

# Reference

@src/app/assessments/page.tsx:

- Assessment centre: browse/search questionnaires, popular/regular/research tabs, QR sharing
- Keep as React SPA; Go serves HTML shell + AEHRC renderer runs client-side

@src/app/assessments/[assessmentsId]/page.tsx:

- Fill assessment: fetches Questionnaire, FhirFormsRenderer with participant selector for practitioners
- Reimplement: Go serves shell with participant-selector templ partial; AEHRC runs client-side

@src/app/assessments/soap/page.tsx:

- SOAP creation: fetches SOAP Questionnaire, participant selector, SoapForm renderer
- Reimplement: Go serves shell with practitioner-only auth guard; AEHRC runs client-side

@src/app/assessments/soap/participant.tsx:

- Patient selector: today's sessions list, create new patient by email
- Reimplement: same participant selection as templ partial (FHIR session query)

@src/components/soap-report/soap-form.tsx:

- SOAP form: AEHRC buildForm + extractObservationBased, submits FHIR transaction Bundle
- Keep: client-side React SPA component running in browser

@src/components/general/fhir-forms-renderer.tsx:

- General form renderer: AEHRC BaseRenderer, localStorage draft, submission, interpretation webhook
- Keep: client-side React SPA component running in browser

@src/services/api/assessment.tsx:

- Assessment API: questionnaire CRUD, SOAP submission, search, result brief
- Adapt: Go proxy forwards /assessments/api/\* to backend FHIR

@src/styles/custom-smart-form.scss:

- Custom SCSS for AEHRC Smart Forms
- Adapt: port to Tailwind or keep as-is in React SPA bundle

@src/components/icons/literature-icon.tsx:

- LiteratureIcon — used for Assessments nav tab
- Reimplement: inline SVG in base.templ

# Risks

| Risk                                    | Likelihood | Impact | Mitigation                                                      |
| --------------------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| AEHRC bundle size too large (~200 KB)   | Low        | Medium | Already expected per ADR-010; cache via service worker          |
| Terminology server URL mismatched       | Medium     | Medium | Pass terminology URL from Go config to React SPA via global var |
| React SPA state lost on HTMX navigation | Low        | Low    | Assessment route is standalone SPA; no HTMX mixing              |

# UAT

1. Visit `/assessments` — assessment centre loads, browse questionnaires
2. Click a questionnaire — form renders with all items
3. Login as practitioner, visit `/assessments/{id}` — participant dropdown appears
4. Select patient, fill form on their behalf — submission references patient as subject
5. Visit `/assessments/soap` — SOAP form loads (practitioner-only)
6. Select patient, fill SOAP, submit — QuestionnaireResponse + Observations created
7. Patient visits `/assessments/soap` — redirected to unauthorized
8. Fill form, save draft — draft persisted to IndexedDB
9. Go offline — form still loads from SW cache, draft saves locally
