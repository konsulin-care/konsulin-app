---
title: Project Structure
description: Go SSR target directory layout (Next.js migration target)
date: 2026-05-26
---

# Overview

Flat Go project layout following standard Go conventions. The frontend
SSR server lives in `cmd/konsulin-app/` with shared libraries in `internal/`.
This is the target structure — the current codebase is still Next.js.

# Directory Map

```
.
├── cmd/
│   └── konsulin-app/         Main frontend server entrypoint
│       ├── main.go           Server startup, config init, router setup
│       ├── routes.go         Chi router definition
│       └── middleware.go     Auth guard, logging, CSRF
├── internal/
│   ├── handler/              HTTP handlers (one per route group)
│   │   ├── clinic.go
│   │   ├── schedule.go
│   │   ├── assessment.go     Proxies to React SPA shell
│   │   ├── profile.go
│   │   ├── record.go
│   │   └── auth.go           Login redirect, cookie handling
│   ├── service/              Business logic, FHIR aggregation
│   │   ├── recommendation.go Availability + ranking computation
│   │   └── pricing.go        Fee composition logic
│   ├── fhir/                 FHIR resource types as Go structs
│   │   ├── types.go          PractitionerRole, Appointment, etc.
│   │   └── client.go         FHIR HTTP client with auth
│   ├── config/               Runtime config (env vars)
│   │   └── config.go         Config struct + loader
│   └── session/              Cookie-based session helpers
│       └── session.go
├── web/
│   ├── template/             templ components
│   │   ├── layout/           Base layout, nav, footer
│   │   ├── pages/            Page-level components
│   │   ├── partials/         HTMX partials (reusable fragments)
│   │   └── components/       Shared UI components (button, card, etc.)
│   ├── static/               Served at /static/
│   │   ├── css/              Tailwind output
│   │   ├── js/               Alpine.js, HTMX, service worker
│   │   └── images/           Static images
│   └── assessment-spa/       React SPA bundle for AEHRC
├── Dockerfile                Multi-stage Go build
├── go.mod
└── Makefile
```

# Key Files

| Path                            | Purpose                         |
| ------------------------------- | ------------------------------- |
| `@/AGENTS.md`                   | Root agent instructions         |
| `@/docs/agents/ARCHITECTURE.md` | System architecture reference   |
| `@/docs/ADR/*.md`               | Architecture decision records   |
| `@/docs/wiki/*.md`              | Current architecture assessment |

# Conventions

- No circular imports between `internal/` packages
- `handler/` depends on `service/`, never the reverse
- `service/` depends on `fhir/` and `config/`
- One file per handler group, one struct per file in `fhir/`
- `web/template/pages/` mirrors route structure
