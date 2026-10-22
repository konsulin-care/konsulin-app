---
title: Role Context Switching
description: Users with multiple roles must explicitly switch active context
status: accepted
date: 2026-05-26
---

# Context

Healthcare workers may hold multiple roles (e.g., practitioner at one
clinic, patient at another). Merged-role interfaces create permission
ambiguity and dangerous accidental actions. Assessment `005-auth-session`
confirms role is stored in the auth cookie.

# Decision

Users with multiple roles must explicitly select their active role via
a dropdown. The Go SSR server reads the active role from the session
and renders the appropriate interface. Switching roles reloads the
page in the new context.

Alternatives considered: merged interfaces (dangerous), role-based tabs
(still ambiguous), automatic detection (unreliable).

# Impact

Clear operational context prevents accidental actions. Role dropdown
visible in the navigation header. Server-side rendering changes based
on active role. Session stores the current role selection.
