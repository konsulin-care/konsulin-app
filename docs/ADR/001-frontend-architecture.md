---
title: Frontend Architecture
description: Go SSR with Chi, templ, HTMX, Alpine.js instead of Next.js React
status: superseded
superseded_by: ADR-015
date: 2026-05-26
---

# Context

Existing Next.js SPA exceeds target operational footprint (15-40 MB idle
RAM goal). Assessment `001-pages-routes` confirms all 25 route groups are
Next.js-specific and must be replaced. Decision was to choose a low-memory,
server-rendered alternative.

# Decision

Use Go SSR with Chi router, templ HTML templates, HTMX for dynamic
interactions, Alpine.js for minimal client-side state, and Tailwind CSS.
Auth handled by client-side supertokens-auth-react SDK on the assessment
SPA page; Go SSR reads auth cookies and proxies requests.

Alternatives considered: Next.js (too heavy), plain Go html/template (no
component model), React SPA (hydration overhead).

# Impact

Positive: 15-40 MB idle RAM, no hydration, small JS payloads (~0 KB for
Go SSR pages). Negative: loss of React ecosystem, more server rendering
complexity, must rebuild all components in templ.

# Refined by ADR-013

The original decision used Alpine.js for "minimal client-side state."
ADR-013 refines this: plain JS modules handle client-side FHIR data
operations (fetch, parse, CRUD), Alpine.js is scoped to lightweight
interactivity (expand/collapse, toggles), and React is reserved for
complex component UIs (auth, AEHRC Smart Forms). See
`@docs/ADR/013-client-side-data-layer.md`.
