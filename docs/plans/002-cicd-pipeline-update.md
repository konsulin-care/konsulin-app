---
title: CI/CD Pipeline Evaluation & Update
description: Audit workflows, update PR checks, remove obsolete actions
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/010-infrastructure.md for current CI/CD and deployment context.

Audit all `.github/workflows/*.yml` (active + disabled). Update
`pull-request.yml` to check PRs against `develop` AND `beta/*` branches
and test both Go SSR and Next.js. Archive/remove obsolete workflows.
Update Docker build and deploy workflows for Go compatibility.

# Goals

- PRs to `develop` AND `beta/*` run Go test + Go build + Next.js test + Next.js build
- Obsolete workflows identified and archived to `.github/workflows/.archive/`
- Docker build workflow supports Go multi-stage build
- All active workflows reference mise-managed tooling

# Implementation Steps

- [ ] Inventory all workflows: list active vs disabled, categorize by purpose (build, deploy, PR check, Docker)
- [ ] Determine per workflow: keep/update/remove based on Go SSR migration stage
- [ ] Update `pull-request.yml`: add `beta/*` as an additional branch trigger alongside existing `develop` trigger, add Go setup + test + build steps alongside Node.js steps
- [ ] Update `docker-build.yml`: add Go build stage, support dual-build (JS + Go) during migration
- [ ] Move disabled/obsolete workflows: `build.yml.disabled`, `ci.yml.disabled`, `deploy-ansible.yml.disabled`, `docker-self-hosted.yml.disabled`, `docker.yml.disabled`, `dev.yml.disabled`, `deploy.yml.disabled` — archive or delete
- [ ] Update `main.yml`: add Go test to deploy pipeline
- [ ] Ensure all active workflows use `mise.toml`-managed tools (via `jdx/mise-action` or manual setup steps)
- [ ] Verify PR to `develop` or `beta/*` triggers new workflow and passes

# Reference

@.github/workflows/pull-request.yml:

- Current PR check: builds Next.js on PR to `develop` branch
- Adapt: add `beta/*` alongside `develop` trigger, add Go test + Go build steps

@.github/workflows/main.yml:

- Current deploy pipeline for develop/main branches
- Adapt: add Go test step to deploy pipeline

@.github/workflows/docker-build.yml:

- Current Docker build with `node:26-slim`, creates .env, builds Next.js
- Replace: migrate to Go multi-stage build with `golang:1.26-alpine`

@.github/workflows/trigger-coolify.yml:

- Coolify deploy trigger (unchanged — still used after migration)
- Keep: same pattern, deployment target may change port from 3000 to 8080

@.github/workflows/README.md:

- Describes build+deploy strategy
- Adapt: update for Go binary workflow

Disabled workflows (\*.disabled):

- 9 disabled workflow files for evaluation
- Archive obsolete ones; keep those with relevant reference patterns

# Risks

| Risk                             | Likelihood | Impact | Mitigation                                    |
| -------------------------------- | ---------- | ------ | --------------------------------------------- |
| Misconfigured CI blocks all PRs  | Medium     | High   | Test workflow on a draft PR first             |
| Removed workflow is still needed | Low        | Medium | Move to `.archive/` instead of delete         |
| Go build step times out in CI    | Low        | Low    | Cache Go module downloads via `actions/cache` |

# UAT

1. Open a draft PR to `develop` or `beta/*` — GitHub Actions triggers, Go test + build pass, Next.js test + build pass
2. Check workflow run summary — no failed steps, all checks green
3. Verify `deploy.yml` still works for existing deployments (no regression)
