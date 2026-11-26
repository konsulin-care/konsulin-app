---
title: Pages & Routes Assessment
description: Current React SPA route patterns for the frontend
domain: frontend
action: current
date: 2026-11-24
---

# Summary

All pages are React SPA components served as static export by Go BFF.
No Go SSR, no templ, no Node.js in production (ADR-015). Dynamic route
segments use query params instead of path segments
(e.g. `/schedule?id=X` instead of `/schedule/[id]`).

The research home is `/research`; the root `/` renders it for patients,
guests, researchers and unauthenticated visitors. Practitioners and clinic
admins keep the dashboard home at `/`.

# Route Map

| Route                | Purpose                      | Component                                   |
| -------------------- | ---------------------------- | ------------------------------------------- |
| `/`                  | Home (role-aware)            | `@/app/page.tsx` (role dispatch)            |
| `/research`          | Research home                | `@/app/research/research-page.tsx`          |
| `/study?id=X`        | One study                    | `@/app/study/study-view.tsx`                |
| `/studies`           | All active studies           | `@/app/studies/studies-view.tsx`            |
| `/report?id=X`       | Participation report         | `@/app/report/report-view.tsx`              |
| `/research/register` | Create a study               | `@/app/research/register/research-form.tsx` |
| `/research/edit`     | Edit a study                 | `@/app/research/edit/research-form.tsx`     |
| `/auth/*`            | SuperTokens auth             | `@/app/auth/` (React SDK)                   |
| `/schedule`          | Appointment list/detail      | `@/app/schedule/page.tsx` (role dispatch)   |
| `/schedule?id=X`     | Appointment detail           | `@/app/schedule/schedule-detail.tsx`        |
| `/practitioner?id=X` | Practitioner profile/booking | `@/app/practitioner/`                       |
| `/clinic*`           | Clinic listing/detail        | `@/app/clinic/`                             |
| `/profile*`          | User profile                 | `@/app/profile/`                            |
| `/record*`           | Medical records              | `@/app/record/`                             |
| `/journal*`          | Notes                        | `@/app/journal/`                            |
| `/assessments*`      | Questionnaires (AEHRC SPA)   | `@/app/assessments/`                        |

# Redirects

- `/?id=X`, `/?view=X`, `/research?id=X` and `/research?view=X` redirect to
  `/study?id=X`, keeping the `ref` parameter
- The study page back button targets `/studies`; `/studies` targets `/`
- The report page back button targets `/study?id=X`, or `/studies` without id

# Business Rules

- Auth guard via cookie check on protected routes
- Role-based access (patient vs practitioner routes)
- Return URL preservation on redirect to login
- Offline fallback page (`/~offline`)
- All data fetching via React Query through Go BFF proxy
