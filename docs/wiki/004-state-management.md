---
title: State Management Assessment
description: React contexts, reducers, custom hooks
domain: frontend
action: remove
dependencies: []
---

# Summary

Three React contexts with reducers manage client-side state. All
must be removed. Go SSR handles state via server-side sessions and
HTMX (server-driven UI). Remaining client-side state uses Alpine.js.

# Context Inventory

| Context    | State                            | Fate                               |
| ---------- | -------------------------------- | ---------------------------------- |
| `auth/`    | User info, login/logout, session | Replace with Go session cookies    |
| `booking/` | Booking flow steps               | Replace with HTMX hx-trigger flow  |
| `profile/` | Profile completeness             | Replace with server-rendered state |

# Custom Hooks

| Hook                    | Purpose               | Fate                          |
| ----------------------- | --------------------- | ----------------------------- |
| `useDebounce`           | Debounced search      | Replace with hx-trigger delay |
| `useLoaded`             | Loading state         | Replace with HTMX indicators  |
| `useSearchWithFallback` | Multi-strategy search | Port to Go handler            |
| `useTodaySessions`      | Today's appointments  | Replace with Go handler       |
| `withAuth`              | Auth HOC              | Replace with Go middleware    |

# Business Rules

- Auth context determines protected vs public UI
- Booking flow is multi-step with validation per step
- Profile completeness blocks certain features
- Session restoration on page refresh via cookie check
