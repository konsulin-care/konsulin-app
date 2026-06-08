---
title: Remove Dead Routes
description: Remove /message and /exercise routes (empty stubs)
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route inventory and @docs/wiki/002-ui-components.md for icon and navigation component references.

Remove the `/message` and `/exercise` routes entirely. Message page is
an empty stub (`<div>Message</div>`) with no conversations or API.
Exercise page is a Media resource list with no real workout/wellness
feature. Both are dead code. Combining removal saves a milestone.

# Goals

- `/message` route removed from Next.js pages
- `/exercise` route removed from Next.js pages
- Chat icon removed from React header component
- Exercise tab removed from React navigation bar
- "Health Exercise Resources" card removed from practitioner home
- All references in wiki docs updated to "removed"

# Implementation Steps

- [ ] Delete `src/app/message/` — remove Next.js page
- [ ] Delete `src/app/exercise/` — remove Next.js pages (list, detail, service)
- [ ] Remove chat icon from `src/components/header.tsx`
- [ ] Remove Exercise tab from `src/components/navigation-bar.tsx`
- [ ] Remove "Health Exercise Resources" card from practitioner home (M005/M018)
- [ ] Update `docs/wiki/001-pages-routes.md` — mark /message and /exercise as removed
- [ ] Update `docs/wiki/002-ui-components.md` — remove chat icon + exercise icon from inventory
- [ ] Delete source files: `src/services/api/exercise.tsx`, `src/components/icons/exercise-icon.tsx`, `public/icons/message-square-chat.svg`

# Reference

@src/app/message/page.tsx:

- Empty stub with "Message" heading and back button
- Remove: delete entire page directory

@src/app/exercise/page.tsx + excercise-list.tsx + [exerciseId]/page.tsx:

- Media resource list with search/filter and iframe detail
- Remove: no real workout/wellness feature

@src/services/api/exercise.tsx:

- React Query hook fetching /fhir/Media resources
- Remove: no longer needed

@src/components/header.tsx (line 26-31):

- Chat icon SVG linking to /message
- Remove: delete from React header component

@src/components/navigation-bar.tsx (line 88-99):

- Exercise tab with ExerciseIcon in bottom nav
- Remove: delete tab and icon from React nav

@src/components/icons/exercise-icon.tsx:

- Exercise SVG icon component
- Remove: delete during cleanup

@public/icons/message-square-chat.svg:

- Chat bubble SVG asset
- Remove: delete during cleanup

@public/images/exercise.svg:

- Exercise illustration used on exercise cards and as generic assessment icon
- Keep: still used by assessment page as generic icon; rename to avoid confusion

@src/app/home-content-clinician.tsx (line 318-334):

- "Health Exercise Resources" card linking to /exercise
- Remove: delete card from practitioner home (replaced by calendar in M018)

@src/components/icons/index.tsx:

- Re-exports ExerciseIcon from exercise-icon.tsx
- Remove: delete ExerciseIcon export line

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                           |
| ------------------------------------------ | ---------- | ------ | -------------------------------------------------------------------- |
| Chat icon removal affects header layout    | Low        | Low    | Only the chat element is removed; header structure unchanged         |
| Exercise SVG still used by assessment page | Low        | Low    | Keep `exercise.svg` asset, rename to `assessment-icon.svg` if needed |

# UAT

1. Navigate app — no chat icon in header
2. No Exercise tab in bottom navigation
3. Visit /message or /exercise — both return 404 from Next.js/Go BFF
4. Assessment cards still show exercise.svg icon (asset retained)
