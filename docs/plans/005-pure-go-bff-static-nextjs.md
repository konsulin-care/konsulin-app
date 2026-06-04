---
title: Pure Go BFF + Static Next.js
description: Migrate home page from Go SSR to Next.js; Go becomes pure BFF
date: 2026-06-03
---

# Overview

Current architecture: Go SSR renders `GET /` via templ templates, fetches
FHIR data server-side. All other routes proxy to Next.js. This creates
timezone-sensitive rendering (server local time vs user local time),
duplicate FHIR parsing logic (Go + React), and two rendering stacks
requiring coordinated changes.

Per ADR-015, the Go server strips all page rendering and becomes a pure
BFF (auth + proxy + static files). All pages are served by Next.js
static export. The home page is now a standard React component that
fetches data client-side via `/proxy/fhir/*`.

# Goals

- Remove Go SSR home page handler and all related template/service code
- Configure Next.js for static export (`output: 'export'`)
- Verify the React home page (`page.tsx`, `home-header.tsx`) correctly
  fetches and displays appointment data
- Refactor 7 dynamic route segments to query-parameter format
- Update Dockerfile for single-binary production build
- Update Makefile for development flow

# Work Packages

| WP  | File                                  | Description                                                    |
| --- | ------------------------------------- | -------------------------------------------------------------- |
| 1   | `005a-remove-go-ssr-home.md`          | Delete Go SSR home handler, service, templates; update main.go |
| 2   | `005b-nextjs-static-export-config.md` | Configure next.config.mjs, refactor layout for static export   |
| 3   | `005c-refactor-dynamic-routes.md`     | Convert 7 `[param]` routes to `?param=`, update all navigation |
| 4   | `005d-dockerfile-build-update.md`     | Multi-stage Dockerfile, Makefile updates, development flow     |

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                         |
| ------------------------------------------ | ---------- | ------ | -------------------------------------------------- |
| Static export blocks server components     | High       | High   | Refactor layout to client-side runtime provider    |
| Missed `router.push` calls for dynamic IDs | Medium     | Medium | Search all files for `/{route}/` patterns          |
| Home page data fetch doesn't fire reliably | Medium     | High   | `getNow()` + `refetchOnMount: 'always'` + fallback |

# UAT

1. `make dev` — opens on port 3000, `GET /` serves Next.js page
2. Visit `/` as Patient — appointment card appears with correct time
3. Refresh `/` — appointment card reappears (fresh fetch via `/proxy/fhir/`)
4. Navigate to `/record?recordId=X` — record page loads correctly
5. `make build` — produces single binary + static export
6. `docker build` — produces alpine image, run on Coolify
