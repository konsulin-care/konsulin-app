---
title: Go SSR Standards
description: Go, Chi router, and templ conventions for server-side rendering
date: 2026-05-26
---

# Go Standards

- Use Chi router (`github.com/go-chi/chi/v5`) for all HTTP routing
- Cognitive complexity must not exceed 15 per function
- File length must not exceed 300 lines per `.go` file
- Explicit error handling: return errors, never panic
- Keep handlers under 20 lines; delegate business logic to service layer
- Use Go 1.22+ `slog` for structured logging
- Prefix interfaces with `I` only when disambiguation is needed
- Config struct populated once at startup via `os.Getenv()`
- Return structured errors with appropriate HTTP codes — avoid bare 500s
- Use `templ.Handler()` for static pages; use `.Render(r.Context(), w)` for dynamic data
- Use `templ.WithStatus()` to set correct status codes on error pages

# Templ Standards

- One component per file, named after the `.templ` file
- Compose layouts by passing `templ.Component` as a parameter
- Use `templ.GenerateComponent` for reusable partials
- Keep template logic minimal — prepare all data in Go handlers
- Render context must carry request-scoped values (CSRF token, user, flash messages)
- Prefix private templates with underscore (`_layout.templ`)
