---
title: Clinic Context Selection
description: Clinic admins explicitly select active clinic context
status: accepted
date: 2026-05-26
---

# Context

Clinic administrators may manage multiple clinics. Without explicit
context, they risk performing governance actions on the wrong clinic.
Assessment `005-auth-session` confirms the current architecture
supports multi-clinic operations.

# Decision

Clinic administrators select their active clinic via a dropdown in the
navigation header. All management actions (practitioner assignments,
service approvals, fee governance) apply to the selected clinic only.

Alternatives considered: no context (dangerous for multi-clinic admins),
per-page selection (inconsistent experience).

# Impact

Prevents cross-clinic governance confusion. Server tracks active clinic
in session. All admin routes require clinic context. Switching clinics
reloads the management interface for the new context.
