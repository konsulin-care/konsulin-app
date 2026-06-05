---
title: Dockerfile & Build Update
description: Multi-stage Dockerfile, Makefile updates, dev flow adjustment
date: 2026-06-03
---

# Overview

Update build pipeline to produce a single Docker image containing the
Go binary and Next.js static export. No Node.js runtime in production.

# Goals

- Multi-stage Dockerfile: Go binary + Next.js export → alpine image
- Makefile updated for new build/dev flow
- `make dev` starts both Go and Next.js dev server

# Implementation Steps

- [ ] Write new `Dockerfile` with three stages: 1. `node:20` — `npm ci && npm run build` → `out/` 2. `golang:1.22` — `go build` → binary 3. `alpine:3.20` — copy binary + `out/`, expose :3000

- [ ] Update `Makefile`:

      - `make dev`: start Go (`go run ./cmd/konsulin-app`) on :3000,
        start Next.js (`npm run dev`) on :8080. Go proxys unmatched
        routes to Next.js (already handled by `r.NotFound`).
      - `make build`: `npm run build` → `go build -o konsulin-app`
      - Remove `templ-gen` and `css-templ` targets (no longer needed).
      - Update `.PHONY` accordingly.

- [ ] Verify: `make dev` — visit `localhost:3000` → home page loads
      via Next.js proxy, `/proxy/fhir/` handled by Go directly.

- [ ] Verify: `make build` — produces binary + `out/` directory.

- [ ] Verify: `docker build -t konsulin-app .` — image builds,
      container runs on :3000, pages are served.

# Reference

Files to modify:

- `Dockerfile` — rewrite with 3-stage build
- `Makefile` — update dev, build targets; remove templ-gen, css-templ
- `.dockerignore` — ensure `out/` is not excluded

# Risks

| Risk                                   | Likelihood | Impact | Mitigation                                           |
| -------------------------------------- | ---------- | ------ | ---------------------------------------------------- |
| `npm run build` requires env vars      | Low        | Medium | Use `.env.example` defaults for static build; no API |
| Go proxy to Next.js dev server is slow | Medium     | Low    | Only affects development; production serves static   |

# UAT

1. `make dev` — Go on :3000, Next.js on :8080, both start cleanly
2. `curl http://localhost:3000/` — returns HTML (from Next.js proxy)
3. `make build` — binary + `out/` produced
4. `docker build -t konsulin-app .` — image builds in <5 mins
5. `docker run -p 3000:3000 konsulin-app` — app serves all routes
