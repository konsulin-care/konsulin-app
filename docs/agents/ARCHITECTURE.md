---
title: System Architecture
description: Go BFF with Next.js static frontend for research and healthcare PWA
status: updated
date: 2026-11-24
---

# Overview

Go BFF (Backend for Frontend) serving a Next.js static React application.
The Go server handles auth cookies, proxies FHIR requests to the backend,
and serves the Next.js static build. All pages are React — no Go SSR
templates, no HTMX, no Alpine.js.

Lowest latency path: browser → Go BFF → FHIR backend → Go BFF → browser.
FHIR Bundle parsing happens entirely on the client side.

# Design Principles

- **Single rendering stack**: React for every page, every route
- **Timezone-safe**: ISO 8601 timestamps pass through as-is, browser
  `Intl.DateTimeFormat` handles local rendering
- **No duplicate logic**: FHIR parsing once (client), auth once (Go BFF)
- **Single binary in production**: Next.js builds to static files, Go
  serves them. No Node.js, no Nginx.
- **Role-driven**: explicit context switching for multi-role users

# System Architecture

```
Browser (Next.js/React SPA)
├── React components: all pages (home, profile, schedule, record, etc.)
├── React Query: data fetching, caching, pagination
├── supertokens-auth-react: client-side auth SDK
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

# Research Routes

The research home is `/research`; the root `/` renders it for patients,
guests, researchers and unauthenticated visitors, while practitioners and
clinic admins keep the dashboard home.

- `/study?id=X` shows one study: metadata facts, take-part panel and the
  report link. It dispatches no `SET_ACTION`.
- `/studies` lists the whole active catalogue, Konsulin-first.
- `/report?id=X` shows the participation report; findings published by the
  research team render on the home findings section.
- `/research/register` and `/research/edit` are the researcher forms.
- Legacy `/?id=X`, `/?view=X`, `/research?id=X` and `/research?view=X`
  links redirect to `/study?id=X`, keeping `ref`.

# Key Decisions

| Decision                         | ADR                                           |
| -------------------------------- | --------------------------------------------- |
| Responsive app shell             | `@docs/ADR/031-responsive-app-shell.md`       |
| Research home + action bar       | `@docs/ADR/032-research-home-shell.md`        |
| Study metadata mapping           | `@docs/ADR/033-study-metadata.md`             |
| Primary action button per screen | `@docs/ADR/034-primary-action-button.md`      |
| Hidden scrollbars                | `@docs/ADR/037-hidden-scrollbars.md`          |
| Design token system              | `@docs/ADR/026-design-token-system.md`        |
| Client cache persistence         | `@docs/ADR/028-client-cache-persistence.md`   |
| BFF shared cache                 | `@docs/ADR/030-bff-shared-cache.md`           |
| Read-only batch cache            | `@docs/ADR/035-read-only-batch-cache.md`      |
| Interpretation engine            | `@docs/ADR/029-interpretation-engine.md`      |
| Client-side data layer           | `@docs/ADR/013-client-side-data-layer.md`     |
| Runtime configuration (env vars) | `@docs/ADR/012-runtime-configuration.md`      |
| Anonymous session consolidation  | `@docs/ADR/016-anon-session-consolidation.md` |
| Go BFF + Next.js static frontend | `@docs/ADR/015-go-bff-static-nextjs.md`       |
| Role context switching           | `@docs/ADR/008-role-context-switching.md`     |

# Data Flow

1. Browser requests `GET /` → Go BFF serves `out/index.html`
   (Next.js static export)
2. React hydrates on the client, reads auth state from cookies
3. Components fetch data via `GET /proxy/fhir/*` → Go BFF injects
   `sAccessToken` as `Authorization: Bearer` → forwards to FHIR backend
4. FHIR backend returns raw Bundle → Go BFF passes it through unchanged
   (transparent proxy)
5. React parses Bundle (`entry[].resource`), runs component logic,
   renders UI
6. All FHIR timestamps are ISO 8601 strings — React formats them
   client-side via `Intl.DateTimeFormat`
