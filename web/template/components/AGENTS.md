---
title: Agentic Documentation web/template/components
description: Shared UI primitives — button, card, modal, badge, dropdown, fee display
---

## Relevant ADRs

| ADR | Rationale                                                                     |
| --- | ----------------------------------------------------------------------------- |
| 001 | Shared reusable templ components: button, card, modal, badge, dropdown        |
| 007 | Shared fee display component for consistent pricing presentation across pages |
| 008 | Shared role dropdown component — reused in nav and profile                    |
| 009 | Shared clinic dropdown component — reused in nav and admin flows              |

## Rules

- One component per file, named after the `.templ` file
- Components are stateless — all data passed as template parameters
- Keep components focused and under 30 lines; extract variants as function parameters
- Role and clinic dropdowns emit HTMX requests on change to trigger server-side context switch
- Fee display component renders transparent pricing breakdown
- Do not import from `pages/` or `partials/` — components are the lowest layer
