---
title: Responsive App Shell
description: Breakpoint-driven navigation shell that replaces the FAB after 768px while keeping phones unchanged
status: accepted
date: 2026-07-20
---

# Context

The app is a static Next.js export whose only navigation and primary action is
the floating action button (FAB) speed-dial. That works on phones, but on
tablets and desktops the FAB wastes horizontal space and hides the role
destinations behind a toggle.

We need a persistent navigation shell for wider viewports without changing the
phone experience, without a load flash (the export is static), and without
duplicating the FAB's nav and action logic.

# Decision

Three width tiers, using Tailwind's default breakpoints:

- **phone** (`< 768px`): nothing changes. The FAB remains the navigation and
  the primary action.
- **md** (`768px`): a 96px rail — icon plus a two-line short label
  (`line-clamp-2`). The primary action becomes a rail tile (icon + two-line
  label).
- **lg** (`1024px` and up): a 240px sidebar — icon and label side by side. The
  primary action becomes a labelled button.

**One component.** The rail and the sidebar are the same `AppSidebar`, styled
CSS-only with `md:w-24 lg:w-60` and `md:flex-col lg:flex-row`.

**FAB stays mounted.** It gets `md:hidden` but stays in the tree, so the fab
context still drives the nav destinations at every width.

**Destinations.** Home (`page-header.nav_home`, not `dashboard`, which is the
"Welcome to Konsulin" greeting) plus the role's pills from
`src/components/fab/pills.ts`, whose labels are `page-header` keys. The nav
therefore mirrors the FAB pills per role.

**Brand.** Follows the landing-page nav: the `/images/site-logo.svg` mark
(`h-9 w-9`) plus the text "Konsulin"
(`text-xl font-extrabold tracking-tight text-foreground`), wrapped in a
`min-h-11` link to `/`. md shows the mark only (text `sr-only`); lg shows both.

**Account menu.** At the nav bottom: an avatar trigger (md) or avatar, name and
role (lg) opening a dropdown with Profile (`/profile`), the other roles (reuse
role switch), a separator, and Log out (link to the existing `/logout`
confirmation route). Unauthenticated users see a Sign in link to `/auth`.

**Layout is CSS-only.** The static export has no server pass, so a
JS-measured layout would flash. A shell CSS variable `--shell-offset`
(`0`, `96px` at md, `240px` at lg) is set via `:root:has([data-shell='nav'])`
and re-centres fixed overlays on the content area. Nav uses `z-30`, below
drawers and overlays.

**Bare routes** (`/auth`, `/logout`, `/remove-account`, `/unauthorized`,
`/~offline` and their subpaths) render no nav. `/admin` keeps `AdminShell`
untouched.

**Overlay exception.** Scoped to overlays, which only open after a user action,
so a media query at render time causes no flash. From `768px` `AppDrawer`
renders as a centred Radix dialog via the existing `useMediaQuery` hook, and
the combobox mobile-sheet breakpoint moves from 640px to 768px (query
`(max-width: 767px)`).

**PageLayout.** A `PageLayout` component with variants `narrow` (640px),
`wide` (1040px at lg) and `split` (main plus a 320px aside at xl) is built
here. Pages keep the 640px narrow column until plan 038 adopts the variants.

All new layout classes are `md:`/`lg:`/`xl:`-prefixed so phones are unchanged.

# Impact

- Tablets and desktops get persistent, role-aware navigation and a visible
  primary action without opening the FAB.
- Phones are untouched: every new class is breakpoint-prefixed and the FAB
  stays the nav and action there.
- The CSS-only rule avoids a load flash but means layout offsets are declared
  once in the `--shell-offset` variable; new fixed elements must consume it.
- Overlays intentionally break the CSS-only rule via `useMediaQuery`. Keep that
  exception scoped to user-initiated overlays.
- `PageLayout` ships unused until plan 038 adopts it per page.
- The nav must stay below drawers (`z-30`) so overlays keep their stacking.
