---
title: Infrastructure Assessment
description: Docker, CI/CD, Ansible deployments, build scripts
domain: infrastructure
action: adapt
dependencies: []
---

# Summary

Deployment pipeline uses GitHub Actions → Docker build → Coolify deploy.
Current Dockerfile is Node.js-specific (npm ci, next build, standalone).
Must adapt to Go multi-stage build. Ansible playbooks, CI workflow
structure, and Coolify integration stay.

# Current Setup

| File                                    | Purpose                   | Action                           |
| --------------------------------------- | ------------------------- | -------------------------------- |
| `Dockerfile`                            | Node.js multi-stage build | Replace with Go multi-stage      |
| `docker/Dockerfile-ci`                  | CI-specific Docker build  | Replace with Go                  |
| `build.sh`                              | Build/push Docker images  | Replace with Go build            |
| `.github/workflows/main.yml`            | CI pipeline trigger       | Adapt (Go build)                 |
| `.github/workflows/docker-build.yml`    | Build + push image        | Adapt (Go binary)                |
| `.github/workflows/pull-request.yml`    | PR validation             | Change to `go build` + `go test` |
| `deployments/playbook-dev.yml`          | Ansible dev deploy        | Adapt (Go binary)                |
| `deployments/playbook-prod.yml`         | Ansible prod deploy       | Adapt                            |
| `deployments/templates/compose.yaml.j2` | Docker Compose template   | Adapt (port 8080)                |

# Business Rules

- Docker image pushed to Docker Hub (konsulin/app)
- Coolify webhook triggered after build
- Two env promotion: dev-app → prod-app
- Ansible copies compose file + docker-compose up
- Container runs on port 3000 (Next.js) → change to 8080 (Go)
