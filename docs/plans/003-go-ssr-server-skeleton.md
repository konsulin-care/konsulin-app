---
title: Go SSR Server Skeleton
description: Chi server, middleware, proxy, static files, base layout
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for current route patterns and @docs/wiki/009-styling-assets.md for current Tailwind/styling setup.

Build the Go SSR server skeleton: Chi router with middleware stack, config
loading from env vars, static file serving, reverse proxy to Next.js for
unmigrated routes, base layout templ component, and `make dev` target.

# Goals

- Chi server starts on port 8080, config from `os.Getenv()`
- `GET /health` returns 200 OK
- `GET /static/*` serves files from `web/static/`
- All unmatched routes proxy to Next.js on port 3000 with cookie forwarding
- Base layout templ component renders HTML shell with nav and footer
- `make dev` starts both Go server and Next.js concurrently
- Tests verify server starts, health endpoint, and proxy routing

# Implementation Steps

- [ ] Create `cmd/konsulin-app/main.go` with Chi router, config init, server startup
- [ ] Create `internal/config/config.go` — Config struct + `Load()` from env vars (PORT, APP_URL, API_URL, NEXTJS_URL)
- [ ] Create middleware: `middleware/logging.go` (slog), `middleware/recovery.go`, `middleware/requestid.go`
- [ ] Add `GET /health` handler returning `{"status":"ok"}`
- [ ] Add static file server at `/static/` pointing to `web/static/`
- [ ] Create `internal/handler/proxy.go` — reverse proxy handler that forwards to `NEXTJS_URL` (default localhost:3000)
- [ ] Proxy copies cookies, Host header, X-Forwarded-For, and SuperTokens auth cookies
- [ ] Register catch-all route the proxy as fallback for unmatched paths
- [ ] Create `web/template/layout/base.templ` — HTML doctype, head (title, meta, Tailwind CSS link, HTMX script, Alpine script), body slot, nav placeholder, footer placeholder
- [ ] Update `Makefile`: add `dev` target (runs Go server + Next.js concurrently), `build-go`, `run` targets
- [ ] Write `internal/config/config_test.go` — verify env var loading with defaults
- [ ] Write `handler/health_test.go` — verify /health returns 200
- [ ] Write `handler/proxy_test.go` — verify unmigrated routes forward to next.js
- [ ] Verify: `make dev` starts both servers, app works via port 8080

# Reference

@src/app/layout.tsx:

- Root layout: React provider hierarchy, PWA metadata, viewport, max-w-screen-sm centering
- Adapt: port HTML shell (meta, viewport, manifest links) to base.templ
- Remove: all React providers (no Go-equivalent context needed)

@src/middleware.ts:

- Edge middleware: auth guard, role check, return URL preservation
- Adapt: port cookie parsing and route access logic to Go middleware

@next.config.mjs:

- Serwist PWA plugin, standalone output, image domains
- Remove: Serwist plugin (plain SW in M006)
- Adapt: image domains list to Go config

@src/components/header.tsx:

- Top bar: teal background, chat icon (/message), bell icon (/notification), child slot
- Reimplement: port header structure to base.templ
- Remove: chat icon (M013 removes /message)
- Keep: child slot for page-specific header content

@src/components/navigation-bar.tsx:

- Bottom nav: 5 tabs — Home (HouseIcon), Appointment (OfficeIcon), Assessments (LiteratureIcon), Exercise (ExerciseIcon), Profile (UserIcon)
- Role-aware: Clinic vs Schedule routing for Appointment tab
- Reimplement: same 5-tab structure in base.templ with Alpine.js active-state highlight
- Remove: Exercise tab (M013 removes /exercise)
- Keep: role-aware routing pattern

@src/components/icons/:

- 7 exported SVG icon components: HouseIcon, OfficeIcon, LiteratureIcon, ExerciseIcon, UserIcon, FilterIcon, LoadingSpinnerIcon
- Reimplement: port needed nav icons as inline SVG partials in `web/template/components/`

# Risks

| Risk                                    | Likelihood | Impact | Mitigation                                                                      |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------- |
| Cookie forwarding breaks auth           | Medium     | High   | Test with real SuperTokens cookies; verify sAccessToken/sRefreshToken forwarded |
| Proxy adds latency to Next.js pages     | Low        | Medium | Proxy is in-process, minimal overhead; this is temporary during migration       |
| Static file pathing wrong in production | Low        | Medium | Use `embed.FS` or explicit `os.DirFS` with configurable root                    |

# UAT

1. Run `make dev` — Go server starts on :8080, Next.js on :3000
2. Visit `http://localhost:8080/health` — returns `{"status":"ok"}`
3. Visit `http://localhost:8080/` — proxied to Next.js, full app renders
4. Login via Next.js — session cookies set, subsequent requests proxied with cookies
5. Visit `http://localhost:8080/static/` — serves files from `web/static/`
