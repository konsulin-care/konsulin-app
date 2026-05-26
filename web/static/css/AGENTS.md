---
title: Agentic Documentation web/static/css
description: Tailwind CSS output — generated, not edited directly
---

## Relevant ADRs

| ADR | Rationale                                                   |
| --- | ----------------------------------------------------------- |
| 001 | Tailwind CSS utility-first styling for all templ components |

## Rules

- This directory is build output — edit Tailwind classes in templ files and regenerate
- Utility-first: no custom CSS unless design requires it
- Use CSS variables from the theme for colors, not arbitrary hex values
- Responsive breakpoints: mobile-first (sm, md, lg)
- Tailwind content config scans `*.go` and `*.templ` files
- Do not commit source maps in production builds
