---
title: API Services Assessment
description: Axios singleton, TanStack React Query hooks, Go BFF proxy
domain: frontend
action: current
date: 2026-06-30
---

# Summary

HTTP client layer using Axios + TanStack React Query. All FHIR API calls
proxy through Go BFF at `/proxy/fhir/*` which injects `sAccessToken` as
`Authorization: Bearer`. No Go SSR — Go BFF is transparent proxy only.

# Service Organization

| File                          | Contents                                            |
| ----------------------------- | --------------------------------------------------- |
| `src/services/api.tsx`        | Axios singleton, interceptors                       |
| `src/services/api-error.ts`   | Error parsing                                       |
| `src/services/api/`           | Domain-specific API hooks (appointments, schedule)  |
| `src/services/hooks/`         | React Query hooks (useAppointments, useAppointment) |
| `src/services/clinic.tsx`     | Clinic/practitioner queries                         |
| `src/services/clinicians.tsx` | Practitioner availability queries                   |
| `src/services/profile.tsx`    | Profile CRUD                                        |

# Patterns

- **Data fetching**: `useQuery` / `useInfiniteQuery` with `/fhir/` path
- **Mutations**: `useMutation` with success invalidation
- **Pagination**: Cursor-based via `Bundle.link[rel=next]` with `pageToken`
- **Auth**: `sAccessToken` cookie attached by Go BFF, not client-side
- **Anonymous sessions**: For unauthenticated assessment flow
