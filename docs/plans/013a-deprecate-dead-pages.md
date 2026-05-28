---
title: Deprecate Dead Pages
description: Remove /notification, /settings, /forget-password, /reset-password, community component
date: 2026-05-27
---

# Overview

Five pages/components have no real functionality and are safe to deprecate:

| Page/Component         | State                                  | Reason                              |
| ---------------------- | -------------------------------------- | ----------------------------------- |
| `/notification`        | Empty stub (`<div>Notification</div>`) | Dead code, same as `/message`       |
| `/settings`            | 7 of 9 menu items `isEnabled: false`   | No real settings functionality      |
| `/forget-password`     | Legacy SuperTokens flow                | Replaced by SuperTokens native flow |
| `/reset-password-form` | Legacy SuperTokens flow                | Replaced by SuperTokens native flow |
| Community component    | Links to misspelled `/comunity` (404)  | Dead link, no community feature     |

# Goals

- Omit `/notification` from Chi router
- Omit `/settings` from Chi router
- Omit `/forget-password` from Chi router
- Omit `/reset-password-form` from Chi router
- Remove Community component and all its imports/usages
- Update plan 005 references to community section

# Implementation Steps

- [ ] Omit `/notification` from Chi router
- [ ] Omit `/settings` from Chi router
- [ ] Omit `/forget-password` from Chi router
- [ ] Omit `/reset-password-form` from Chi router
- [ ] Remove Community section from guest home template (plan 005)
- [ ] Remove Community section from patient home template (plan 005)
- [ ] Remove Community section from practitioner home template (plan 018)
- [ ] Update `docs/plans/005-home-page-migration.md` — remove community references from layout descriptions
- [ ] Delete source files during M019: `src/app/notification/`, `src/app/settings/`, `src/app/(auth)/forget-password/`, `src/app/(auth)/reset-password-form/`, `src/components/general/home/community.tsx`

# Reference

@src/app/notification/page.tsx:

- Empty stub: header + `<div>Notification</div>`
- Remove: do not implement in Go SSR

@src/app/settings/page.tsx + layout.tsx:

- Static menu list with 7 of 9 items disabled
- Remove: no real settings functionality

@src/app/(auth)/forget-password/page.tsx:

- Legacy forgot password form with email input + 9-min cooldown
- Remove: do not implement in Go SSR

@src/app/(auth)/reset-password-form/page.tsx:

- Legacy reset password form reading token from URL
- Remove: do not implement in Go SSR

@src/components/general/home/community.tsx:

- Links to misspelled `/comunity` (404)
- Remove: delete entire component file

@src/app/home-content-guest.tsx (line 3, 49):

- Imports and renders `<Community />`
- Remove: delete import and usage, adjust layout

@src/app/home-content-patient.tsx (line 29, 251):

- Imports and renders `<Community />`
- Remove: delete import and usage, adjust layout

@src/app/home-content-clinician.tsx (line 33, 396):

- Imports and renders `<Community />`
- Remove: delete import and usage, adjust layout

@docs/plans/005-home-page-migration.md:

- References community in 7 lines (19, 20, 29, 41, 72, 77, 82)
- Update: remove community section from all role layouts

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                                                                |
| ------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Settings page had useful features we missed | Low        | Low    | Audit showed 7/9 items disabled; the 2 working items (password change, app version) are covered elsewhere |
| Community section removal leaves visual gap | Low        | Low    | Home page templates will fill space naturally; no layout breaking                                         |

# UAT

1. Visit `/notification` — proxied to Next.js stub until M019, then 404
2. Visit `/settings` — same behavior
3. Visit `/forget-password` — same behavior
4. Visit `/reset-password-form` — same behavior
5. Home page for all roles — no Community section rendered
6. After M019 — all five return 404 from Go SSR
