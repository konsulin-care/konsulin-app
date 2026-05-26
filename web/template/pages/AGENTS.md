---
title: Agentic Documentation web/template/pages
description: Page-level templ components served by Go SSR — mirrors route structure
---

## Relevant ADRs

| ADR | Rationale                                                                 |
| --- | ------------------------------------------------------------------------- |
| 001 | Full page-level templ components served by Go SSR                         |
| 003 | Recommendation page — displays shaped recommendations                     |
| 005 | Practitioner calendar page — unified view across clinics                  |
| 006 | Patient booking flow page — recommendation-first UX                       |
| 010 | Assessment page shell — mount point `<div id="aehrc-root">` for React SPA |
| 011 | PHR timeline page — progressive loading skeleton with HTMX lazy targets   |

## Rules

- Mirror route structure: file names and hierarchy match URL paths
- Keep template logic minimal — prepare all data in Go handlers, pass to template
- Break large pages into small components scoped by `hx-target` (templ re-renders entire component on change)
- Assessment SPA page is the only Go SSR page that delegates to a client-side mount point
- PHR timeline page must have lazy-load targets for `hx-trigger` on scroll/revealed
- Pages compose layout components, partials, and shared components — never duplicate layout code
