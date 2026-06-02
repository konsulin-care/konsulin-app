---
title: System Architecture
description: Go SSR frontend for healthcare scheduling PWA
status: updated
date: 2026-06-02
---

# Overview

Server-side rendered Go web application serving a healthcare scheduling
platform. Low-memory, mobile-first, FHIR-native architecture. One React
SPA route for AEHRC Smart Forms assessments; all other pages are
Go SSR + HTMX supplemented by Alpine.js for
interactivity.

# Design Principles

- Low RAM: target 15-40 MB idle, 50-120 MB under load
- Mobile-first: minimal JS on Go SSR pages
- FHIR-native: no custom endpoints, frontend aggregates FHIR resources
- Progressive: timeline loading for PHR, HTMX partial updates
- Role-driven: explicit context switching for multi-role users
- Two client-side islands: Alpine (interactivity), React (complex UIs); FHIR data server-side rendered

# System Architecture

```
Browser
│
├── Two client-side islands:
│   ├── Alpine.js ── expand/collapse, mobile menu, toggles
│   └── React ── auth (supertokens-react), AEHRC Smart Forms
│
├── Go SSR pages: templ + HTMX + Alpine.js (interactivity); FHIR data server-side rendered
├── Assessment page: React SPA (AEHRC Smart Forms)
└── Auth: supertokens-auth-react (client-side SDK)
        ↓
Go SSR Frontend (Chi)
├── HTML templates (templ)
├── React SPA bundle server (/assessment/*)
├── Cookie-based auth guard
├── API proxy to backend (/proxy/*)
└── Static assets (/static/): Alpine.js, HTMX
        ↓
Backend API (Go + SuperTokens Go SDK)
├── FHIR R4 endpoints (Blaze FHIR)
├── Scheduling service
└── Session verification
```

# Key Decisions

| Decision                         | ADR                                              |
| -------------------------------- | ------------------------------------------------ |
| Go SSR + Chi + templ + HTMX      | `@docs/ADR/001-frontend-architecture.md`         |
| Backend FHIR compliance          | `@docs/ADR/002-backend-fhir-compliance.md`       |
| Recommendation shaping           | `@docs/ADR/003-recommendation-shaping.md`        |
| Dynamic scheduling               | `@docs/ADR/004-dynamic-scheduling.md`            |
| Unified practitioner calendar    | `@docs/ADR/005-unified-practitioner-calendar.md` |
| Recommendation-first patient UX  | `@docs/ADR/006-recommendation-first-ux.md`       |
| Pricing model                    | `@docs/ADR/007-pricing-model.md`                 |
| Role context switching           | `@docs/ADR/008-role-context-switching.md`        |
| Clinic context selection         | `@docs/ADR/009-clinic-context-selection.md`      |
| Offline assessment (AEHRC SPA)   | `@docs/ADR/010-offline-assessment-support.md`    |
| Timeline-based PHR rendering     | `@docs/ADR/011-timeline-based-phr-rendering.md`  |
| Runtime configuration (env vars) | `@docs/ADR/012-runtime-configuration.md`         |
| Three Islands client-side layer  | `@docs/ADR/013-client-side-data-layer.md`        |
| SSR upcoming session             | `@docs/ADR/014-ssr-upcoming-session.md`          |

# Data Flow

1. Browser request → Chi router → middleware (auth, logging)
2. Go SSR renders initial HTML (templates) including server-side fetched data (e.g. upcoming session)
3. Client-side islands hydrate on page load:
   a. Alpine.js handles interactivity (mobile menu, toggles)
   b. React SPA mount points (assessment) render independently
4. HTMX handles partial updates (form submit, pagination)
5. Assessment page loads React SPA → AEHRC renders Questionnaire
6. React SPA communicates via Go SSR proxy → backend FHIR API
