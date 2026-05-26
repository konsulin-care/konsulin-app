---
title: React SPA Integration Standards
description: Embedding AEHRC Smart Forms React SPA in Go SSR
date: 2026-05-26
---

# Overview

The assessment section serves a React SPA within the Go SSR application.
All React code lives in `web/assessment-spa/`; no React exists outside this directory.

# SPA Shell Pattern

- Go handler serves a shell HTML page with `<div id="aehrc-root">` mount point
- React mounts via `createRoot(document.getElementById('aehrc-root'))` — CSR only, no `renderToString`
- Scope HTMX to non-SPA routes to avoid header conflicts with AEHRC scripts
- Bundle output (JS, CSS, assets) builds to `web/static/` and is served at `/static/` prefix

# API Proxying

- Go handler proxies API calls from the React SPA to the backend FHIR API
- All requests are same-origin — no CORS needed in production
- The Go handler adds auth cookies and session headers to proxied requests

# Auth

- Auth is shared via HTTP cookies set by Go SSR, not localStorage
- React SPA reads auth status from cookies via Go proxy

# Service Worker

- Cache-first strategy for React bundle assets (versioned filenames prevent staleness)
- NetworkFirst strategy for navigation requests to the assessment SPA
- Version service worker files with cache busting in the build step

# Constraints

- React SPA is CSR-only — no server-side React rendering
- Bundle target size: ~200 KB (AEHRC Smart Forms renderer)
- Terminology server URL configured in React env, not Go env vars
