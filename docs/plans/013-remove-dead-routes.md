---
title: Remove Dead Routes
description: Remove /message and /exercise routes (empty stubs)
date: 2026-05-26
---

# Overview

Remove the `/message` and `/exercise` routes entirely. Message page is
an empty stub (`<div>Message</div>`) with no conversations or API.
Exercise page is a Media resource list with no real workout/wellness
feature. Both are dead code. Combining removal saves a milestone.

# Goals

- `/message` route NOT implemented in Go SSR
- `/exercise` route NOT implemented in Go SSR
- Chat icon removed from header template
- Exercise tab removed from navigation bar
- "Health Exercise Resources" card removed from practitioner home
- All references in wiki docs updated to "removed"

# Implementation Steps

- [ ] Omit `/message` from Chi router
- [ ] Omit `/exercise` from Chi router
- [ ] Remove chat icon from `web/template/layout/base.templ` header
- [ ] Remove Exercise tab from navigation-bar in `base.templ` (Alpine.js nav)
- [ ] Remove "Health Exercise Resources" card from practitioner home (M005/M018)
- [ ] Update `docs/wiki/001-pages-routes.md` — mark /message and /exercise as removed
- [ ] Update `docs/wiki/002-ui-components.md` — remove chat icon + exercise icon from inventory
- [ ] Delete source files during M019: `src/app/message/`, `src/app/exercise/`, `src/services/api/exercise.tsx`, `src/components/icons/exercise-icon.tsx`, `public/icons/message-square-chat.svg`, `public/images/exercise.svg`

# Reference

@src/app/message/page.tsx:

- Empty stub with "Message" heading and back button
- Remove: do not implement in Go SSR

@src/app/exercise/page.tsx + excercise-list.tsx + [exerciseId]/page.tsx:

- Media resource list with search/filter and iframe detail
- Remove: no real workout/wellness feature

@src/services/api/exercise.tsx:

- React Query hook fetching /fhir/Media resources
- Remove: no Go equivalent needed

@src/components/header.tsx (line 26-31):

- Chat icon SVG linking to /message
- Remove: delete from Go SSR header template

@src/components/navigation-bar.tsx (line 88-99):

- Exercise tab with ExerciseIcon in bottom nav
- Remove: delete tab and icon from Go SSR nav

@src/components/icons/exercise-icon.tsx:

- Exercise SVG icon component
- Remove: not needed in Go SSR, delete during M019

@public/icons/message-square-chat.svg:

- Chat bubble SVG asset
- Remove: delete during M019 cleanup

@public/images/exercise.svg:

- Exercise illustration used on exercise cards and as generic assessment icon
- Keep: still used by assessment page as generic icon; rename to avoid confusion

@src/app/home-content-clinician.tsx (line 318-334):

- "Health Exercise Resources" card linking to /exercise
- Remove: delete card from practitioner home (replaced by calendar in M018)

@src/components/icons/index.tsx:

- Re-exports ExerciseIcon from exercise-icon.tsx
- Remove: delete ExerciseIcon export line during M019

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                           |
| ------------------------------------------ | ---------- | ------ | -------------------------------------------------------------------- |
| Chat icon removal affects header layout    | Low        | Low    | Only the chat element is removed; header structure unchanged         |
| Exercise SVG still used by assessment page | Low        | Low    | Keep `exercise.svg` asset, rename to `assessment-icon.svg` if needed |

# UAT

1. Navigate app — no chat icon in header
2. No Exercise tab in bottom navigation
3. Visit /message or /exercise — proxied to Next.js stub until M019
4. After M019 — both return 404 from Go SSR
5. Assessment cards still show exercise.svg icon (asset retained)
