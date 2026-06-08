---
title: Deprecate Dead Pages
description: Remove /notification, /settings, /forget-password, /reset-password, community component
date: 2026-06-05
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

- Delete `/notification` Next.js page
- Delete `/settings` Next.js page
- Delete `/forget-password` Next.js page
- Delete `/reset-password-form` Next.js page
- Remove Community component and all its imports/usages
- Update plan 005 references to community section

# Implementation Steps

- [ ] Delete `src/app/notification/`
- [ ] Delete `src/app/settings/`
- [ ] Delete `src/app/(auth)/forget-password/`
- [ ] Delete `src/app/(auth)/reset-password-form/`
- [x] Remove Community section from guest home template (plan 005)
- [x] Remove Community section from patient home template (plan 005)
- [x] Remove Community section from practitioner home template (plan 018)
- [x] Update `docs/plans/005-home-page-migration.md` — remove community references from layout descriptions
- [x] Delete source files: `src/components/general/home/community.tsx`

# Reference

@src/app/notification/page.tsx:

- Empty stub: header + `<div>Notification</div>`
- Remove: delete entire page directory

@src/app/settings/page.tsx + layout.tsx:

- Static menu list with 7 of 9 items disabled
- Remove: delete entire page directory

@src/app/(auth)/forget-password/page.tsx:

- Legacy forgot password form with email input + 9-min cooldown
- Remove: delete page directory

@src/app/(auth)/reset-password-form/page.tsx:

- Legacy reset password form reading token from URL
- Remove: delete page directory

@src/components/general/home/community.tsx:

- Links to misspelled `/comunity` (404)
- Removed: file deleted

@src/app/home-content-guest.tsx (line 3, 49):

- Imports and renders `<Community />`
- Removed: import and usage deleted

@src/app/home-content-patient.tsx (line 29, 251):

- Imports and renders `<Community />`
- Removed: import and usage deleted

@src/app/home-content-clinician.tsx (line 33, 396):

- Imports and renders `<Community />`
- Removed: import and usage deleted

@docs/plans/005-home-page-migration.md:

- References community in 7 lines (19, 20, 29, 41, 72, 77, 82)
- Removed: all community references removed from layout descriptions

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                                                                |
| ------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Settings page had useful features we missed | Low        | Low    | Audit showed 7/9 items disabled; the 2 working items (password change, app version) are covered elsewhere |
| Community section removal leaves visual gap | Low        | Low    | Home page templates fill space naturally; no layout broken                                                |

# UAT

1. Visit `/notification` — returns 404 from Next.js/Go BFF
2. Visit `/settings` — same behavior
3. Visit `/forget-password` — same behavior
4. Visit `/reset-password-form` — same behavior
5. Home page for all roles — no Community section rendered (done)
6. All five routes removed — no routing fallbacks needed
