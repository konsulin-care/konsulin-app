---
title: System Architecture
description: Go BFF with Next.js static frontend for healthcare scheduling PWA
status: updated
date: 2026-06-03
---

# Overview

Go BFF (Backend for Frontend) serving a Next.js static React
application. The Go server handles auth cookies, proxies FHIR
requests to the backend, and serves the Next.js static build.
All pages are React — no Go SSR templates, no HTMX, no Alpine.js.

Lowest latency path: browser → Go BFF → FHIR backend → Go BFF → browser.
FHIR Bundle parsing happens entirely on the client side.

# Design Principles

- **Single rendering stack**: React for every page, every route
- **Timezone-safe**: ISO 8601 timestamps pass through as-is, browser
  `Intl.DateTimeFormat` handles local rendering
- **No duplicate logic**: FHIR parsing once (client), auth once (Go BFF)
- **Single binary in production**: Next.js builds to static files,
  Go serves them. No Node.js, no Nginx.
- **Role-driven**: explicit context switching for multi-role users

# System Architecture

```
Browser (Next.js/React SPA)
│
├── React components: all pages (home, profile, schedule, record, etc.)
├── React Query: data fetching, caching, pagination
├── supertokens-auth-react: client-side auth SDK
│
↓
Go BFF (Chi router, single binary)
├── GET /proxy/*     → FHIR backend (inject sAccessToken)
├── POST /auth/*     → cookie management
├── GET /api/config  → runtime config JSON
├── GET /static/*    → Go dev static assets
└── GET /*           → serve Next.js static export (out/)
        ↓
Backend API (Go + SuperTokens Go SDK)
├── FHIR R4 endpoints (Blaze FHIR)
├── Scheduling service
└── Session verification
```

# Key Decisions

| Decision                              | ADR                                                      |
| ------------------------------------- | -------------------------------------------------------- |
| Go BFF + Next.js static frontend      | `@docs/ADR/015-go-bff-static-nextjs.md`                  |
| Anonymous session consolidation       | `@docs/ADR/016-anon-session-consolidation.md`            |
| Client-side data layer                | `@docs/ADR/013-client-side-data-layer.md`                |
| SSR upcoming session                  | `@docs/ADR/014-ssr-upcoming-session.md`                  |
| Backend FHIR compliance               | `@docs/ADR/002-backend-fhir-compliance.md`               |
| Recommendation shaping                | `@docs/ADR/003-recommendation-shaping.md`                |
| Client-side free interval computation | `@docs/ADR/017-client-side-free-interval-computation.md` |
| Unified practitioner calendar         | `@docs/ADR/005-unified-practitioner-calendar.md`         |
| Recommendation-first patient UX       | `@docs/ADR/006-recommendation-first-ux.md`               |
| Pricing model                         | `@docs/ADR/007-pricing-model.md`                         |
| Role context switching                | `@docs/ADR/008-role-context-switching.md`                |
| Clinic context selection              | `@docs/ADR/009-clinic-context-selection.md`              |
| Offline assessment (AEHRC SPA)        | `@docs/ADR/010-offline-assessment-support.md`            |
| Timeline-based PHR rendering          | `@docs/ADR/011-timeline-based-phr-rendering.md`          |
| Runtime configuration (env vars)      | `@docs/ADR/012-runtime-configuration.md`                 |

# Data Flow

1. Browser requests `GET /` → Go BFF serves `out/index.html`
   (Next.js static export)
2. React hydrates on the client, reads auth state from cookies
3. Components fetch data via `GET /proxy/fhir/*` →
   Go BFF injects `sAccessToken` as `Authorization: Bearer` →
   forwards to FHIR backend
4. FHIR backend returns raw Bundle → Go BFF passes it through
   unchanged (transparent proxy)
5. React parses Bundle (`entry[].resource`), runs component
   logic, renders UI
6. All FHIR timestamps are ISO 8601 strings — React formats
   them client-side via `Intl.DateTimeFormat`

# Superseded Decisions

| Decision                          | Superseded By       |
| --------------------------------- | ------------------- |
| Go SSR + Chi + templ + HTMX       | ADR-015             |
| Three Islands client-side layer   | ADR-014 (→ ADR-015) |
| SSR upcoming session              | ADR-015             |
| Backend-side interval computation | ADR-017             |
