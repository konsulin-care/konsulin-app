---
title: Pages & Routes Assessment
description: Current React SPA route patterns for the frontend
domain: frontend
action: current
date: 2026-06-30
---

# Summary

All pages are React SPA components served as static export by Go BFF.
No Go SSR, no templ, no Node.js in production (ADR-015). Dynamic route
segments use query params instead of path segments
(e.g. `/schedule?id=X` instead of `/schedule/[id]`).

# Route Map

| Route                | Purpose                      | Component                                 |
| -------------------- | ---------------------------- | ----------------------------------------- |
| `/`                  | Home (role-aware)            | `@/app/page.tsx` (role dispatch)          |
| `/auth/*`            | SuperTokens auth             | `@/app/auth/` (React SDK)                 |
| `/schedule`          | Appointment list/detail      | `@/app/schedule/page.tsx` (role dispatch) |
| `/schedule?id=X`     | Appointment detail           | `@/app/schedule/schedule-detail.tsx`      |
| `/practitioner?id=X` | Practitioner profile/booking | `@/app/practitioner/`                     |
| `/clinic*`           | Clinic listing/detail        | `@/app/clinic/`                           |
| `/profile*`          | User profile                 | `@/app/profile/`                          |
| `/record*`           | Medical records              | `@/app/record/`                           |
| `/journal*`          | Notes                        | `@/app/journal/`                          |
| `/assessments*`      | Questionnaires (AEHRC SPA)   | `@/app/assessments/`                      |

# Business Rules

- Auth guard via cookie check on protected routes
- Role-based access (patient vs practitioner routes)
- Return URL preservation on redirect to login
- Offline fallback page (`/~offline`)
- All data fetching via React Query through Go BFF proxy
