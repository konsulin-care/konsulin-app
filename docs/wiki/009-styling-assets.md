---
title: Styling & Assets Assessment
description: Tailwind config, SCSS, public assets, design tokens
domain: frontend
action: adapt
dependencies: []
---

# Summary

Tailwind CSS v4 with custom design tokens, global styles, and
static assets (images, icons, favicons). Design tokens port directly.
Content scanner must target `.go` and `.templ` files instead of `.tsx`.

# Current Config

| Aspect           | Value                                    | Action                      |
| ---------------- | ---------------------------------------- | --------------------------- |
| Tailwind version | v4 with `@tailwindcss/postcss`           | Keep                        |
| Dark mode        | `class` strategy                         | Keep                        |
| Content scan     | `*.{ts,tsx}` paths                       | Change to `*.go`, `*.templ` |
| Custom colors    | CSS variables (primary, secondary, etc.) | Keep                        |
| Border radius    | xl=32px, lg=16px, md=8px, sm=4px         | Keep                        |
| Animations       | accordion-down/up keyframes              | Keep                        |
| Plugins          | tailwindcss-animate, scrollbar-hide      | Port                        |

# Asset Inventory

| Directory         | Content             | Action                         |
| ----------------- | ------------------- | ------------------------------ |
| `public/images/`  | 25 SVGs/PNGs        | Keep — serve via Go FileServer |
| `public/icons/`   | 33 SVG/PNG icons    | Keep                           |
| `public/favicon/` | 20 favicon variants | Keep                           |
| `src/styles/`     | Global CSS, SCSS    | Port to app.css                |

# Business Rules

- Dark mode toggle persisted in user preference
- Custom component styles use CSS variables for theming
- Phone input styles required for international phone fields
- Scrollbar hide utility needed for mobile UIs
