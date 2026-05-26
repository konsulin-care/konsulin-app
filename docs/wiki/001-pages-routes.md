---
title: Pages & Routes Assessment
description: Next.js App Router pages, middleware, server actions, API routes
domain: frontend
action: replace
dependencies: []
---

# Summary

25 route groups in Next.js App Router pattern. Every page component
uses React (JSX, hooks, client components). All routing logic is
Next.js-specific and must be replaced with Chi router + templ templates.

# Route Map

| Route             | Purpose                 | Go SSR replacement               |
| ----------------- | ----------------------- | -------------------------------- |
| `/`               | Home (role-aware)       | Chi handler + templ              |
| `/auth/*`         | SuperTokens auth        | React SPA (assessment page only) |
| `/clinic*`        | Clinic listing/detail   | Chi handler + templ              |
| `/assessments*`   | Questionnaires          | React SPA (AEHRC)                |
| `/schedule*`      | Appointment views       | Chi handler + templ              |
| `/practitioner/*` | Profiles & availability | Chi handler + templ              |
| `/profile*`       | User profile            | Chi handler + templ              |
| `/record*`        | Medical records         | Chi handler + templ              |
| `/journal*`       | Notes                   | Chi handler + templ              |
| `/message`        | Messaging               | Chi handler + templ              |
| `api/*`           | Next.js API routes      | Go proxy/handler                 |

# Business Rules

- Auth guard via cookie check on protected routes
- Role-based access (patient vs practitioner routes)
- Return URL preservation on redirect to login
- Offline fallback page (`/~offline`)
- Server action for setting auth cookies
