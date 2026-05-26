---
title: Agentic Documentation web/template/layout
description: Base layout shell — nav, footer, HTMX/Alpine.js script imports, Tailwind CSS link
---

## Relevant ADRs

| ADR | Rationale                                                                              |
| --- | -------------------------------------------------------------------------------------- |
| 001 | Base layout includes templ structure, HTMX/Alpine.js script imports, Tailwind CSS link |
| 006 | Layout variations for patient view (recommendation-first) vs admin views               |
| 008 | Navigation header includes role dropdown; layout renders different nav per role        |
| 009 | Navigation header includes clinic dropdown for multi-clinic admins                     |

## Rules

- One component per file, named after the `.templ` file
- Prefix private templates with underscore (`_layout.templ`)
- Include `@ctx.Inject()` for CSRF tokens and flash messages in base layout
- Role dropdown and clinic dropdown rendered conditionally based on session data
- HTMX scripts in `<head>`; Alpine.js deferred in `<head>`
- Layout is the only place where `<html>`, `<head>`, `<body>` tags are defined
