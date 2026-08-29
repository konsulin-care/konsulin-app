---
title: AppDrawer Standardization
description: Standardize bottom-sheet drawers on a single AppDrawer component
status: accepted
date: 2026-08-06
---

# Context

Bottom-sheet drawers were built directly on the Vaul primitive
(`src/components/ui/drawer.tsx`) across 30+ consumers. This produced
inconsistent patterns:

- Multiple CTAs per drawer (Save + Cancel, Pay Now + Pay Later,
  Start + Close), conflating the primary action with dismissal.
- Footers in normal document flow scrolled out of view on long content.
- Height overrides diverged (85dvh primitive, 100dvh in
  `study-detail-view`, `h-[85%]` in `practitioner-availability`).
- Some drawers spanned the full desktop viewport while the app content
  column is capped at `max-w-screen-sm`, causing edge-to-edge drawers.
- Redundant `fixed right-0 bottom-0 left-0 mx-auto max-w-screen-sm`
  classes were copy-pasted across consumers.
- A dead Radix-based `sheet.tsx` added confusion.

Options considered: (a) rewrite the primitive into the opinionated
component, (b) keep the primitive and add an opinionated wrapper
composing it. Option (b) was chosen to preserve the primitive for edge
cases (nested drawers, custom layouts) while standardizing the common
case.

# Decision

Introduce `AppDrawer` (`src/components/ui/app-drawer.tsx`) as the
standard bottom-sheet drawer. Contract:

- Height capped at `max-h-[85dvh]` (dvh, mobile URL-bar aware).
- Width capped at the content column (`mx-auto max-w-screen-sm`),
  baked into the primitive's `DrawerContent` defaults so bare
  consumers also align on desktop.
- Exactly one sticky CTA button in the footer
  (`mt-auto sticky bottom-0`), always visible regardless of content
  length. `ctaDisabled` renders the inactive state, `ctaLoading` shows
  a spinner. Omitting `ctaLabel`/`onCtaClick` renders a footerless
  drawer.
- Optional slots: `trigger` (DrawerTrigger), `title`/`description`
  (standardized header), `footerContent` (footnotes under the CTA),
  `className` (passthrough, e.g., height override).
- Dismissal is outside-click, drag, or Escape only — no Cancel/Close
  buttons anywhere.
- All form, payment, filter, detail, and confirmation drawers were
  migrated to AppDrawer; secondary Cancel buttons and the Pay Later
  path were removed. The dead `sheet.tsx` was deleted.

# Impact

- One source of truth for drawer layout, CTA state styling, and
  dismissal; future drawers are consistent by construction.
- Migrating consumers dropped duplicate buttons, simplifying form
  submission flows (single verb per drawer).
- Footer CTA stays visible on long content without manual `sticky`
  hacks per drawer.
- Trade-offs: dismissal affordances rely on outside-click/drag (no
  visible Close button); filters no longer apply their selection on
  outside-click — Apply must be pressed explicitly.
