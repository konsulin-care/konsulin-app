---
title: API Services Assessment
description: Axios singleton, react-query hooks, error handling
domain: frontend
action: replace
dependencies: []
---

# Summary

HTTP client layer using axios + react-query. Business logic in
service files is framework-agnostic and port-worthy to Go.
react-query hooks are React-specific and must be removed.

# File Inventory

| File                   | Contents                           | Fate                                |
| ---------------------- | ---------------------------------- | ----------------------------------- |
| `api.tsx`              | axios singleton, interceptors      | Port HTTP logic to Go               |
| `api-error.ts`         | Error parsing                      | Port to Go                          |
| `auth.ts`              | Cookie restoration                 | Replace — Go reads cookies directly |
| `clinic.tsx`           | react-query hooks for clinic data  | Port query logic to Go handlers     |
| `clinicians.tsx`       | react-query hooks for availability | Port query logic to Go handlers     |
| `profile.tsx`          | Profile CRUD + react-query         | Port to Go services                 |
| `api/appointments.tsx` | Appointment CRUD                   | Port to Go handlers                 |
| `api/assessment.tsx`   | Questionnaire submit               | Port to Go proxy                    |
| `api/schedule.ts`      | Schedule management                | Port to Go handlers                 |

# Business Rules

- Auth token attached to every request via axios interceptor
- Error responses trigger toast + redirect on token expiry
- Anonymous sessions for unauthenticated assessment
- FHIR API calls need proper content-type headers
- Idempotent POST for questionnaire submission
