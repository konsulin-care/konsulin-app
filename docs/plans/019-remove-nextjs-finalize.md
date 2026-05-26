---
title: Remove Next.js & Finalize
description: Purge JS stack, Go-only Dockerfile, CI/CD final
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/010-infrastructure.md for current Docker and deployment configuration to understand what must be preserved.

Complete the migration by removing all Next.js/JS code, dependencies,
and configuration. Finalize the Go-only build pipeline, Dockerfile,
CI/CD workflows, and documentation.

# Goals

- All `src/`, `node_modules/`, `public/` (excl. SW) Next.js code removed
- `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint*` removed
- `package.json`, `package-lock.json` removed (unless needed for SW tests)
- `.husky/` pre-commit replaced with pure Go pre-commit hook
- Dockerfile updated to Go multi-stage build (no Node.js stage)
- `go.mod` replaces `package.json` as single dependency manifest
- GitHub Actions workflows updated for Go-only build and test
- `.env.example` updated to Go-style env vars (no `NEXT_PUBLIC_` prefix)
- README and CONTRIBUTING.md updated for Go workflow
- `vitest` replaced with `go test`; JS test files removed or archived

# Implementation Steps

- [ ] Remove `src/`, `public/`, `node_modules/`, `.next/`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint*`, `.prettier*`, `components.json`
- [ ] Remove `package.json`, `package-lock.json`
- [ ] Update `.husky/pre-commit` to run only `go test ./...` and `go vet ./...`
- [ ] Update `Dockerfile` to Go multi-stage build (golang:1.26-alpine build, distroless or alpine run)
- [ ] Update `Makefile` — remove Node.js targets, keep `build`, `test`, `lint`, `run`
- [ ] Update `.github/workflows/pull-request.yml` — remove Node.js setup, keep Go test+build
- [ ] Update `.github/workflows/docker-build.yml` — Go build, no `.env` file creation
- [ ] Update `.env.example` — remove `NEXT_PUBLIC_` vars, add Go server vars (PORT, API_URL)
- [ ] Update `README.md` and `CONTRIBUTING.md` for Go workflow
- [ ] Archive JS test files or remove them
- [ ] Verify: `make build` produces binary, `go test ./...` passes, CI green

# Reference

Files to delete during this milestone:

- `src/` (entire directory) — all Next.js pages, components, services, utils, types
- `public/` (except assets migrated to web/static/) — Next.js-specific SVGs, icons, SW
- `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`
- `package.json`, `package-lock.json`, `node_modules/`
- `.eslintrc.json`, `eslint.config.cjs`, `.prettierrc`, `.prettierignore`, `components.json`
- `next-env.d.ts`, `.next/`, `vitest.config.ts`

Files to update:

- `Dockerfile` — replace Node.js multi-stage with Go multi-stage (golang:1.26-alpine)
- `.github/workflows/pull-request.yml` — remove Node.js setup; keep Go setup
- `.github/workflows/docker-build.yml` — Go build, no .env file creation
- `.husky/pre-commit` — replace `vitest run && go test` with `go test ./... && go vet ./...`
- `Makefile` — remove Node.js targets (test-js, dev-js); keep build, test, lint, run
- `.env.example` — remove NEXT*PUBLIC* prefix vars, add Go server vars
- `README.md`, `CONTRIBUTING.md` — update for Go workflow
- `mise.toml` — remove Node.js if no longer needed

# Risks

| Risk                                         | Likelihood | Impact | Mitigation                                                                 |
| -------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------- |
| Something important still depends on Node.js | Medium     | High   | Run `git grep` for any remaining JS imports; test full app before removing |
| Service worker tests need Node.js            | Low        | Medium | Keep vitest only for SW tests, or rewrite SW tests in Go                   |
| Team unfamiliar with Go workflow             | High       | Medium | Update CONTRIBUTING.md with clear Go setup steps; provide make targets     |

# UAT

1. Clone fresh repo — run `mise install` → Go installed
2. Run `make build` — binary produced at `cmd/konsulin-app/konsulin-app`
3. Run `./konsulin-app` — server starts on :8080, app works end-to-end
4. Run `go test ./...` — all tests pass
5. Run `git commit` — pre-commit runs Go tests and vet, all green
