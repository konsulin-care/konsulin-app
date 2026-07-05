---
title: Assessment SPA Routes
description: AEHRC Smart Forms React SPA in Next.js
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/007-aehrc-forms.md for current AEHRC Smart Forms integration and SOAP flow.

Serve the AEHRC Smart Forms React SPA from Next.js pages instead of
Go SSR shell templates (ADR-010). Three assessment flows are served by
Next.js page components. The SPA bundles are served as Next.js static
assets; API calls are proxied to backend FHIR through Go BFF. Aligned
with ADR-015.

# Goals

- `GET /assessments` — Next.js page renders SPA shell for assessment browse centre
- `GET /assessments?id=<id>` — Next.js page renders SPA shell for fill questionnaire (patient or practitioner-on-behalf)
- `GET /assessments/soap` — Next.js page renders SPA shell (practitioner-only SOAP)
- Practitioner selects patient via participant dropdown component
- SOAP uses AEHRC Smart Forms + `extractObservationBased()` to produce Observation resources
- SOAP submitted as FHIR transaction Bundle (QuestionnaireResponse + Observation[])
- Practitioner-only auth guard on `/assessments/soap` via Next.js middleware or page effect
- React SPA bundles at `@/assessment-spa/` built into Next.js static export
- Go BFF proxies `/assessments/api/*` to backend FHIR
- IndexedDB-based draft persistence for offline (ADR-010)
- Terminology server URL passed from Go config via global JS variable (set in Go `index.html` injection)

# Implementation Steps

- [ ] Create `@/assessments/page.tsx` — SPA shell: browse centre (no query) or fill questionnaire (with `?id=<id>`)
- [ ] Create `@/assessments/soap/page.tsx` — SPA shell with practitioner-only guard
- [ ] Create participant-selector React component (fetches today's sessions, allows patient search)
- [ ] Add auth guard in `@/assessments/soap/page.tsx` — redirect non-Practitioner roles
- [ ] Ensure React SPA bundles (`@/assessment-spa/`) are built by Next.js pipeline
- [ ] Go BFF: register `/assessments/api/*` proxy route (already exists in proxy pattern)
- [ ] Write `@/assessments/__tests__/assessment.test.tsx` — test SPA mount, auth guard, SOAP submission

# Reference

@@/assessments/page.tsx:

- Assessment centre: browse/search questionnaires, popular/regular/research tabs, QR sharing
- Keep: same React SPA, served by Next.js page

@@/assessments/[assessmentsId]/page.tsx:

- Fill assessment: fetches Questionnaire, FhirFormsRenderer with participant selector for practitioners
- Keep: same React component; add participant-selector as React component (was templ partial)

@@/assessments/soap/page.tsx:

- SOAP creation: fetches SOAP Questionnaire, participant selector, SoapForm renderer
- Keep: same React rendering; auth guard via React effect or Next.js middleware

@@/assessments/soap/participant.tsx:

- Patient selector: today's sessions list, create new patient by email
- Keep: participant selector as React component (was templ)

@@/components/soap-report/soap-form.tsx:

- SOAP form: AEHRC buildForm + extractObservationBased, submits FHIR transaction Bundle
- Keep: client-side React SPA component running in browser

@@/components/general/fhir-forms-renderer.tsx:

- General form renderer: AEHRC BaseRenderer, localStorage draft, submission, interpretation webhook
- Keep: client-side React SPA component running in browser

@@/services/api/assessment.tsx:

- Assessment API: questionnaire CRUD, SOAP submission, search, result brief
- Adapt: Go BFF proxies /assessments/api/\* to backend FHIR

# Risks

| Risk                                  | Likelihood | Impact | Mitigation                                                     |
| ------------------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| AEHRC bundle size too large (~200 KB) | Low        | Medium | Already expected per ADR-010; cache via service worker         |
| Terminology server URL mismatched     | Medium     | Medium | Pass terminology URL from Go config to React via global var    |
| SPA routing conflicts with Next.js    | Low        | High   | Keep SPA on dedicated routes; Next.js won't SSR the SPA bundle |

# UAT

1. Visit `/assessments` — assessment centre loads, browse questionnaires
2. Click a questionnaire — form renders with all items
3. Login as practitioner, visit `/assessments?id=<id>` — participant dropdown appears
4. Select patient, fill form on their behalf — submission references patient as subject
5. Visit `/assessments/soap` — SOAP form loads (practitioner-only)
6. Select patient, fill SOAP, submit — QuestionnaireResponse + Observations created
7. Patient visits `/assessments/soap` — redirected to unauthorized
8. Fill form, save draft — draft persisted to IndexedDB
9. Go offline — form still loads from SW cache, draft saves locally
