---
title: Code Standards
description: Go, templ, HTMX, Alpine.js, Tailwind, FHIR conventions
date: 2026-05-26
---

# Go Standards

- Use Chi router (`github.com/go-chi/chi/v5`) for all HTTP routing
- Explicit error handling: return errors, never panic
- Keep handlers thin (< 20 lines); delegate to service functions
- Use Go 1.22+ `slog` for structured logging
- Prefix interfaces with `I` only when disambiguation is needed
- Config struct populated once at startup via `os.Getenv()`

# Templ Standards

- One component per file, named after the `.templ` file
- Use `templ.GenerateComponent` for reusable partials
- Keep template logic minimal — prepare data in Go handlers
- Use `@ctx.Inject()` for CSRF tokens and flash messages
- Prefix private templates with underscore (`_layout.templ`)

# HTMX Standards

- Use `hx-trigger` for lazy loading (scroll, revealed, intersect)
- Use `hx-target` for partial DOM updates, never full page reload
- Return HTML fragments from endpoints, not JSON
- Use `HX-Redirect` for auth redirects
- CSRF token in `HX-Request` header for POST/PUT/DELETE

# Alpine.js Standards

- Use Alpine only for client-side state that can't be server-driven
- Prefer HTMX for data fetching; Alpine for UI toggles (x-show)
- Keep x-data expressions under 5 lines; extract to functions
- No AJAX calls from Alpine — use HTMX instead

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
