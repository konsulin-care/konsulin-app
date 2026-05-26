---
title: UI Components Assessment
description: shadcn/ui library, feature components, icons, layout
domain: frontend
action: replace
dependencies: []
---

# Summary

49 shadcn/ui components (Radix-based) + 40 feature components across
13 subdirectories. All rendered in JSX. Must be replaced with templ
components + Alpine.js for interactivity. Design tokens (colors,
spacing) port to new Tailwind config.

# Component Inventory

| Directory                               | Count | Action              |
| --------------------------------------- | ----- | ------------------- |
| `ui/` (accordion, button, dialog, etc.) | 49    | Replace with templ  |
| `general/` (avatar, loader, QR, etc.)   | 16    | Replace with templ  |
| `icons/` (SVG components)               | 9     | Port to static SVGs |
| `availability/` (editor, time-range)    | 5     | Replace with templ  |
| `schedule/` (mark-unavailability)       | 2     | Replace with templ  |
| `profile/` (collapsible, settings)      | 10    | Replace with templ  |
| `login/` (input, logo)                  | 3     | Replace with templ  |
| `journal/` (calendar, create, edit)     | 3     | Replace with templ  |
| `soap-report/` (soap-form)              | 1     | React SPA (AEHRC)   |

# Business Rules

- shadcn/ui uses Radix primitives — no direct Go equivalent
- Custom styles use Tailwind utility classes (portable)
- Icons are inline SVGs — use Go `embed` + SVG rendering
- Drawer/modal patterns map to Alpine.js x-show
- Form validation patterns (react-hook-form + zod) replaced by HTMX validation
