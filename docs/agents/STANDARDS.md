---
title: Code Standards
description: Root standards file — references focused sub-documents for each domain
date: 2026-05-26
---

# Overview

This file aggregates all code standards by reference.
Each domain has a focused document under `@docs/agents/`.

# References

| Domain        | Document                      | Scope                                           |
| ------------- | ----------------------------- | ----------------------------------------------- |
| Go SSR        | `@docs/agents/go-ssr.md`      | Go, Chi, templ standards                        |
| HTMX + Alpine | `@docs/agents/htmx-alpine.md` | HTMX patterns, Alpine.js conventions            |
| React SPA     | `@docs/agents/react-spa.md`   | AEHRC Smart Forms embedding                     |
| Linting       | `@docs/agents/linting.md`     | Cognitive complexity, file length, import rules |

# Tailwind Standards

- Utility-first: no custom CSS unless design requires it
- Use CSS variables from the theme for colors (not arbitrary hex)
- Responsive breakpoints: mobile-first (sm, md, lg)
- State-driven styling: for custom `@layer utilities` classes that
  respond to `data-state`, `aria-*`, or `[data-*]` attributes, define
  an explicit CSS class with `!important` (e.g.
  `.foo[data-state='active']`). Do NOT use Tailwind `data-[*]:`
  variant modifiers — they silently fail for custom utilities.

# JavaScript/TypeScript Standards

- **Event handlers**: wrap void-returning calls in braces —
  `onClick={e => { handler(e); }}`, not `onClick={e => handler(e)}`.
  The shorthand form implicitly returns `undefined` and triggers
  `no-confusing-void-expression` in type-aware linters.
- **State guards**: avoid redundant null checks on state initialized
  with a non-null default (`useState<T>([])`). Trust the initializer.
- **Dynamic keys**: use `Map<K, V>` instead of `Record<K, V>` when
  the key set is dynamic. This prevents prototype pollution via
  `__proto__` or `constructor` keys.
- **Hook cleanup**: `useEffect` cleanup functions that call a void
  method should use braces: `return () => { observer.disconnect(); }`.
- **Naming**: avoid `children` as a local variable name in React
  components — it shadows the built-in `ReactNode` prop.

# FHIR Standards

- Use strict R4 resource types as Go structs
- Bundle processing: paginate via `Bundle.link[rel=next]`
- Never call backend with non-FHIR parameters
- Cache stable resources (Practitioner, Organization) with TTL
- Use `_include` to eager-load referenced resources and avoid N+1 queries
- Use `_summary=count` for list endpoints when only metadata is needed
