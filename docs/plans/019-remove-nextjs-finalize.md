---
title: Remove Go SSR & Finalize SPA
description: Purge Go SSR templates, finalize Next.js + Go BFF build
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/010-infrastructure.md for current Docker and deployment configuration.

Complete the migration by removing all Go SSR code — templ page templates,
Go page handlers, Go page services, and the templ generation pipeline.
Keep Go as pure BFF (proxy, auth, config, session, `/api/recommendations`).
Next.js is the single UI layer. Aligned with ADR-015.

# Goals

- All `web/template/` (templ pages, partials, layouts) removed — React replaces every page
- Go page handlers (`internal/handler/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `home.go`, `calendar.go`, `recommendation.go`, `context.go`) removed unless they serve BFF endpoints
- Page services (`internal/service/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `calendar.go`) removed — logic moved to React or BFF endpoint
- `templ` generation removed from toolchain and `Makefile`
- Dockerfile updated to Go BFF + Next.js static export (single binary serving `out/`)
- GitHub Actions workflows updated for Go BFF + Next.js build
- `.env.example` updated — keep `NEXT_PUBLIC_` vars for Next.js, add Go BFF vars
- README and CONTRIBUTING.md updated for Go BFF + Next.js workflow
- Go test files for removed page handlers/services archived or removed

# Implementation Steps

- [ ] Remove `web/template/` directory (all `.templ` page templates, partials, layouts)
- [ ] Remove Go page handlers: `internal/handler/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `home.go`, `calendar.go`, `recommendation.go` (page handlers — keep `context.go` for cookie endpoints, keep `proxy.go`, `auth.go`, `config.go`)
- [ ] Remove Go page services: `internal/service/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `calendar.go` (keep `recommendation.go` if BFF endpoint is there, keep `pricing.go` used by BFF)
- [ ] Remove `internal/template/` (templ renderer if exists)
- [ ] Remove `cmd/templgen/` or any templ generation tooling
- [ ] Remove `templ` dependency from `go.mod`
- [ ] Remove templ generation targets from `Makefile` (`templ-gen`, `css-templ`)
- [ ] Update `Dockerfile` — three-stage: `node:20` builds Next.js → `out/`, `golang:1.22` builds BFF binary, `alpine:3.20` copies both
- [ ] Update `Makefile` — `make dev` starts Go BFF + Next.js dev; `make build` runs Next.js build + Go build
- [ ] Update GitHub Actions workflows — Node.js setup for Next.js build + Go setup for BFF
- [ ] Update `.env.example` — keep `NEXT_PUBLIC_*` vars, add Go BFF server vars
- [ ] Update `README.md` and `CONTRIBUTING.md` for Go BFF + Next.js workflow
- [ ] Remove page handler/service test files; keep BFF test files (`proxy_test.go`, `auth_test.go`, `context_test.go`)
- [ ] Verify: `npm run build` succeeds, `go build` succeeds, `go test ./...` passes, binary serves app

# Reference

## Files to Delete

- `web/template/` — entire directory (templ page templates and partials)
- `internal/handler/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `home.go`, `calendar.go`, `recommendation.go` (page-rendering handlers)
- `internal/service/profile.go`, `schedule.go`, `practitioner.go`, `clinic.go`, `record.go`, `journal.go`, `calendar.go` (page-oriented services)
- `internal/template/` (templ renderer)
- `cmd/templgen/` (templ generation)

## Files to Keep

- `internal/handler/proxy.go` — FHIR proxy
- `internal/handler/auth.go` — auth cookie endpoints
- `internal/handler/config.go` — runtime config endpoint
- `internal/handler/context.go` — role/clinic context cookie endpoints
- `internal/service/recommendation.go` — BFF endpoint aggregation
- `internal/service/pricing.go` — pricing logic used by BFF endpoint
- `internal/session/` — session management
- `internal/config/` — server configuration
- `cmd/konsulin-app/` — main binary entry point
- All FHIR proxy and middleware code

# Risks

| Risk                                      | Likelihood | Impact | Mitigation                                                                  |
| ----------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Something still depends on Go SSR handler | Medium     | High   | Run full app and verify every route renders from Next.js                    |
| Service worker tests need Node.js         | Low        | Medium | Keep vitest only for SW tests if needed                                     |
| Team unfamiliar with Next.js workflow     | High       | Medium | Update CONTRIBUTING.md with clear Next.js setup steps; provide make targets |

# UAT

1. Clone fresh repo — run `npm ci` then `go mod download`
2. Run `make build` — Next.js static export produced at `out/`, Go binary at `cmd/konsulin-app/konsulin-app`
3. Run `./konsulin-app` — server starts on :3000, serves app end-to-end
4. Run `go test ./...` — all BFF tests pass
5. Run `npm run lint` — no errors
