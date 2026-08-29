# Deployment Workflow

## Active Workflows

All tooling managed via `mise.toml` — Go 1.26.3 and Node 24 installed by `jdx/mise-action`.

| Workflow              | Trigger                     | Purpose                                      |
| --------------------- | --------------------------- | -------------------------------------------- |
| `pull-request.yml`    | PR to `develop` or `beta/*` | Go test + build, Next.js test + build        |
| `main.yml`            | Push to `develop` or `main` | Go test, Docker build + push, Coolify deploy |
| `docker-build.yml`    | Called by `main.yml`        | Build Go binary image, push to Docker Hub    |
| `trigger-coolify.yml` | Called by `main.yml`        | Trigger Coolify webhook deployment           |
| `deploy.yml`          | Called by `main.yml`        | Health check via SSH                         |

## Go SSR Binary

- Multi-stage Dockerfile: `golang:1.26-alpine` builder, `gcr.io/distroless/static-debian12:nonroot` runner
- Port: 8080 (was 3000 for Next.js)
- Image: `konsulin/konsulin-app` pushed to Docker Hub
- Source: `cmd/konsulin-app/main.go`

## Development

- Go SSR: `go run ./cmd/konsulin-app`
- Next.js (separate, for reference): `npm run dev`

## Archived Workflows

Obsolete workflows moved to `.archive/`. See each file for the original configuration.
