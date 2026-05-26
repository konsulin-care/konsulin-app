---
title: AEHRC Smart Forms Assessment
description: FHIR Questionnaire rendering, SOAP forms, offline draft
domain: frontend
action: stay
dependencies: [005-auth-session.md]
---

# Summary

AEHRC Smart Forms renders FHIR Questionnaires as a client-side React
SPA. It loads Questionnaire data via API, renders the form, and
submits responses. No server-side rendering needed. The Go SSR
frontend serves the SPA shell page and proxies API calls to backend.

# Current Implementation

| File                      | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `fhir-forms-renderer.tsx` | Questionnaire renderer with offline draft       |
| `soap-form.tsx`           | SOAP note form with FHIR Observation extraction |

# Architecture

```
Browser: React SPA (AEHRC renderer)
  → loads Questionnaire JSON from Go proxy
  → renders form client-side
  → saves drafts to localStorage
  → submits QuestionnaireResponse via Go proxy
Go SSR: serves <div id="root"> shell, bridges API
```

# Business Rules

- Questionnaire loads from FHIR API via Go proxy
- `useBuildForm()` initializes form from Questionnaire JSON
- Responses saved to localStorage as draft (key: `response_{questionnaireId}`)
- Validation checks required items before submission
- Guest users submit without author/subject
- Authenticated users trigger webhook on interpretation items
- SOAP form extracts Observation resources via `extractObservationBased()`
- Terminology server URL configurable via env var
