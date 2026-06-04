---
title: Refactor Dynamic Routes to Query Params
description: Convert 7 [param] route segments to ?param= for static export compatibility
date: 2026-06-03
---

# Overview

Next.js static export cannot serve dynamic path segments like
`/record/[recordId]`. These must become query parameters:
`/record?recordId=xxx`.

# Goals

- 7 `[param]` route directories converted to `page.tsx` at parent level
- All `<Link>` and `router.push()` calls updated to query-param format
- Existing page components preserve all functionality

# Implementation Steps

- [ ] Convert `src/app/practitioner/[practitionerId]/page.tsx` →
      `src/app/practitioner/page.tsx`. Read ID via
      `useSearchParams().get('practitionerId')`.

- [ ] Convert `src/app/clinic/[clinicId]/page.tsx` →
      `src/app/clinic/page.tsx`. Read `clinicId` from query params.

- [ ] Convert `src/app/profile/[path]/page.tsx` →
      `src/app/profile/page.tsx`. Read `path` from query params.

- [ ] Convert `src/app/assessments/[assessmentsId]/page.tsx` →
      `src/app/assessments/page.tsx`. Read `assessmentsId` from
      query params.

- [ ] Convert `src/app/exercise/[exerciseId]/page.tsx` →
      `src/app/exercise/page.tsx`. Read `exerciseId` from query
      params.

- [ ] Convert `src/app/schedule/[appointmentId]/page.tsx` →
      `src/app/schedule/page.tsx`. Read `appointmentId` from query
      params.

- [ ] Convert `src/app/record/[recordId]/page.tsx` →
      `src/app/record/page.tsx`. Read `recordId` from query params.

- [ ] Search and update all `<Link href="/record/..."` or
      `<Link href="/schedule/..."` patterns to use query-param format.

- [ ] Search and update all `router.push('/record/...')` or
      `router.push('/schedule/...')` calls.

- [ ] Verify: delete old `[param]` directories, `npm run build`
      does not warn about missing `generateStaticParams`.

# Reference

Conversion table:

| Old Path                         | New Path        | Query Param      |
| -------------------------------- | --------------- | ---------------- |
| `/practitioner/[practitionerId]` | `/practitioner` | `practitionerId` |
| `/clinic/[clinicId]`             | `/clinic`       | `clinicId`       |
| `/profile/[path]`                | `/profile`      | `path`           |
| `/assessments/[assessmentsId]`   | `/assessments`  | `assessmentsId`  |
| `/exercise/[exerciseId]`         | `/exercise`     | `exerciseId`     |
| `/schedule/[appointmentId]`      | `/schedule`     | `appointmentId`  |
| `/record/[recordId]`             | `/record`       | `recordId`       |

# Risks

| Risk                                             | Likelihood | Impact | Mitigation                                             |
| ------------------------------------------------ | ---------- | ------ | ------------------------------------------------------ |
| Missed navigation links cause broken routes      | Medium     | High   | `grep -r "/record/\|/schedule/" src/` and audit each   |
| `useSearchParams()` returns null on first render | Medium     | Medium | Guard with `useEffect` or `Suspense` boundary (exists) |

# UAT

1. Visit `/record?recordId=123` — loads record for ID 123
2. Visit `/schedule?appointmentId=456` — loads schedule for ID 456
3. Click navigation link from home → profile → record → back — all work
4. `npm run build` — no warnings about missing `generateStaticParams`
