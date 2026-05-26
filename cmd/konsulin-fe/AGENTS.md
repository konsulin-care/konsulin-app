---
title: Agentic Documentation cmd/konsulin-fe
description: Main frontend server entrypoint — startup, Chi router, middleware chain
---

## Relevant ADRs

| ADR | Rationale                                                                              |
| --- | -------------------------------------------------------------------------------------- |
| 001 | Chi router setup, templ renderer init, HTMX/Alpine.js static serving, middleware order |
| 008 | Middleware reads active role from cookie session before routing                        |
| 009 | Middleware reads active clinic context from cookie session for admin routes            |
| 010 | Serves `/assessment/*` SPA shell, proxies AEHRC API calls                              |
| 012 | Reads env vars at startup via `os.Getenv()`, populates config struct, injects via DI   |

## Rules

- Chi middleware order: logging before auth, recover after all routes
- Validate all env vars at startup with `os.LookupEnv()` + `slog.Error` + `os.Exit(1)`; never use raw `os.Getenv()` without checking zero value
- Config struct populated once, injected into handlers; never call `os.Getenv()` in handlers or services
- Serving frontend assets while proxying API on same port — prefix static routes explicitly to avoid conflicts
- `/assessment/*` SPA route must be last in route chain, after all API and SSR routes
- Use `slog` for structured logging in middleware; avoid global loggers
