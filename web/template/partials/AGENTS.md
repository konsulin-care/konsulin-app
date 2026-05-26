---
title: Agentic Documentation web/template/partials
description: HTMX partials — reusable HTML fragments returned for dynamic updates
---

## Relevant ADRs

| ADR | Rationale                                                                                  |
| --- | ------------------------------------------------------------------------------------------ |
| 001 | HTMX partials returned as HTML fragments, never full pages                                 |
| 003 | Recommendation card partial — practitioner, specialty, duration, fee, nearest availability |
| 004 | Availability window partial — dynamic time range display                                   |
| 005 | Calendar event partial — color-coded by clinic with tags                                   |
| 006 | Recommendation card partial — curated display with fee breakdown                           |
| 007 | Fee breakdown partial — base_fee, practitioner_adjustment, system_adjustment, final_fee    |
| 011 | Timeline segment partial — loaded lazily on scroll or by category                          |

## Rules

- Use `templ.GenerateComponent` for reusable partials
- Return HTML fragments only — HTMX consumes HTML, not JSON
- Partials must be independently renderable and identifiable by `hx-target`
- Fee breakdown partial displays transparent pricing: `base_fee + practitioner_adjustment + system_adjustment = final_fee`
- Timeline segment partials work with `hx-trigger` scroll/revealed for progressive loading
- Keep partials focused; extract shared sub-patterns into `web/template/components/`
