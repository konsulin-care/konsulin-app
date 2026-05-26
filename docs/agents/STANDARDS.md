---
title: Code Standards
description: Root standards file — references focused sub-documents for each domain
date: 2026-05-26
---

# Overview

This file aggregates all code standards by reference.
Each domain has a focused document under `@docs/agents/`.

# References

| Domain        | Document                      | Scope                                           |
| ------------- | ----------------------------- | ----------------------------------------------- |
| Go SSR        | `@docs/agents/go-ssr.md`      | Go, Chi, templ standards                        |
| HTMX + Alpine | `@docs/agents/htmx-alpine.md` | HTMX patterns, Alpine.js conventions            |
| React SPA     | `@docs/agents/react-spa.md`   | AEHRC Smart Forms embedding                     |
| Linting       | `@docs/agents/linting.md`     | Cognitive complexity, file length, import rules |

# Tailwind Standards

- Utility-first: no custom CSS unless design requires it
- Use CSS variables from the theme for colors (not arbitrary hex)
- Responsive breakpoints: mobile-first (sm, md, lg)
- Content config must scan `*.go` and `*.templ` files

# FHIR Standards

- Use strict R4 resource types as Go structs
- Bundle processing: paginate via `Bundle.link[rel=next]`
- Never call backend with non-FHIR parameters
- Cache stable resources (Practitioner, Organization) with TTL
- Use `_include` to eager-load referenced resources and avoid N+1 queries
- Use `_summary=count` for list endpoints when only metadata is needed
