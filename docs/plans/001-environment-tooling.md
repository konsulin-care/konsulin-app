---
title: Environment & Tooling
description: mise, Go scaffold, pre-commit, Tailwind CLI setup
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/010-infrastructure.md for current CI/CD and deployment context.

Set up development environment with mise (Go 1.26.3, Node LTS, templ CLI),
initialize the Go module, update pre-commit to test both stacks, configure
Tailwind v4 standalone CLI for templ, and update Makefile/.gitignore.

# Goals

- mise manages all tool versions from one `mise.toml`
- Pre-commit runs `vitest run` (Next.js) and `go test ./...` (Go SSR)
- Tailwind v4 standalone CLI scans `web/template/**/*.templ`
- First Go test verifies server skeleton starts
- All existing Next.js tests still pass
- `package-lock.json` and `go.sum` committed for lockfile-verified dependency installs
- `mise.toml` locks all tool versions (Go, Node, templ CLI) for CI reproducibility

# Implementation Steps

- [ ] Install mise (if absent), create `mise.toml` with Go 1.26.3, Node LTS, templ CLI
- [ ] Add `mise.toml` and `go.mod` to project root
- [ ] Run `go mod init github.com/konsulin-care/konsulin-app`
- [ ] Run `go mod tidy` to generate `go.sum` for Go module verification
- [ ] Verify `package-lock.json` exists (for `npm ci` in CI — reproducible install)
- [ ] Add `make deps` target: runs `npm ci && go mod download`
- [ ] Scaffold `cmd/konsulin-app/main.go` with minimal Chi server (port 8080, /health returning 200)
- [ ] Install templ CLI via mise or `go install github.com/a-h/templ/cmd/templ@latest`
- [ ] Install Tailwind v4 standalone CLI
- [ ] Create `tailwind.config.ts` (or JS) that scans `web/template/**/*.templ`
- [ ] Update `.husky/pre-commit` to run `vitest run && go test ./...`
- [ ] Update `.gitignore` for Go artifacts (`*.out`, `*.test`, `vendor/`, `target/`, `coverage/`)
- [ ] Update `Makefile`: `test-go`, `test-js`, `test`, `lint-go`, `dev` targets
- [ ] Write `cmd/konsulin-app/main_test.go` — starts server, hits /health, asserts 200
- [ ] Verify: `go test ./...` passes, `vitest run` passes, `git commit` triggers both

# Reference

@go.mod + @go.sum:

- Go module manifest and auto-generated checksum file
- Use `go mod download` in CI for reproducible Go dependency installs
- Run `go mod verify` to validate checksums

@package-lock.json:

- npm lockfile (already committed)
- Use `npm ci` in CI (not `npm install`) for deterministic JS installs

@mise.toml (new):

- Tool version lockfile: Go 1.26.3, Node LTS, templ CLI
- Use `jdx/mise-action` in GitHub Actions to install tools from mise.toml

@.husky/pre-commit:

- Current hook runs `npm run lint-staged` (ESLint + Prettier on staged JS/TS/CSS/MD)
- Adapt: add `go test ./... && go vet ./...` after `vitest run`

@.gitignore:

- Already ignores node_modules/, .next/, .env.local, etc.
- Add: Go artifacts (_.out, _.test, vendor/, target/, coverage/)

# Risks

| Risk                                | Likelihood | Impact | Mitigation                                                |
| ----------------------------------- | ---------- | ------ | --------------------------------------------------------- |
| mise not on PATH in CI              | Low        | High   | Pin mise in CI via `jdx/mise-action` GitHub Action        |
| templ CLI version mismatch          | Low        | Medium | Pin templ version in mise.toml                            |
| Go test environment differs from CI | Low        | Medium | Same `mise.toml` used locally and in CI                   |
| Go sum mismatch on first build      | Low        | Low    | Run `go mod verify` in CI; commit `go.sum` from local dev |

# UAT

1. Run `mise install` — confirms Go 1.26.3, Node LTS, templ CLI installed
2. Run `go test ./...` — passes, shows server test OK
3. Run `vitest run` — passes, existing Next.js tests still green
4. Stage a file, run `git commit` — pre-commit runs both test suites, all pass
