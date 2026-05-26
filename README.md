<p align="center" style="padding-top:20px">
 <img width="100px" src="https://github.com/konsulin-care/landing-page/raw/main/assets/images/global/logo.svg" align="center" alt="GitHub Readme Stats" />
 <h1 align="center">Konsulin App</h1>
 <p align="center">An open source digital wellness app</p>
</p>

<p align="center">
  <a href="https://deepwiki.com/konsulin-care/konsulin-app"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  <a href="https://github.com/konsulin-care/konsulin-app/releases"><img src="https://img.shields.io/github/v/release/konsulin-care/konsulin-app?style=flat" alt="GitHub release (with filter)"></a>
  <a href="https://github.com/konsulin-care/konsulin-app/actions"><img src="https://img.shields.io/github/actions/workflow/status/konsulin-care/konsulin-app/main.yml?style=flat" alt="GitHub Workflow Status (with event)"></a>
  <a href="https://hl7.org/fhir/R4"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.konsulin.care%2Ffhir%2Fmetadata&query=%24.fhirVersion&label=FHIR&color=red" alt="Blaze"></a>
  <a href="https://github.com/konsulin-care/konsulin-app/wiki"><img src="https://img.shields.io/badge/read%20the%20docs-here-blue?style=flat" alt="Docs"></a>
  <a href="https://feedback.konsulin.care"><img src="https://img.shields.io/badge/discuss-here-0ABDC3?style=flat" alt="Static Badge"></a>
</p>

## Architecture

- **Go SSR**: Chi router serving templ + HTMX pages (port 8080)
- **React SPA**: Assessment page (AEHRC Smart Forms) only
- **Styling**: Tailwind CSS v4 (PostCSS for Next.js, standalone CLI for templ)
- **Backend**: Blaze FHIR server (FHIR R4) + SuperTokens auth
- **Tooling**: mise manages all tool versions

## Prerequisites

- [mise](https://mise.jdx.dev/) — tool version manager

## Quick Start

```sh
# Install tools (Go 1.26.3, Node 24, templ CLI, golangci-lint)
mise install

# Install JS/Go dependencies
make deps

# Copy environment config
cp .env.example .env

# Start Go SSR dev server
go run ./cmd/konsulin-app

# Or for Next.js frontend
npm run dev
```

- Go SSR: http://localhost:8080
- Next.js: http://localhost:3000

## Available Scripts

| Command | Description |
|---|---|
| `make test` | Run all tests (Go + JS) |
| `make check-go` | Run all Go lint checks |
| `make css-templ` | Generate Tailwind CSS for templ |
| `npm run dev` | Start Next.js dev server |
| `npm run lint` | Run ESLint |

## Stack

- **Go SSR**: Chi, templ, HTMX, Alpine.js
- **React**: Next.js 14 (assessment SPA only)
- **CSS**: Tailwind CSS v4
- **Auth**: SuperTokens
- **FHIR**: Blaze (R4)

## License

Konsulin is distributed under the [AGPL-3.0 License](./LICENSE). Commercial licenses available at [hello@konsulin.care](mailto:hello@konsulin.care).
