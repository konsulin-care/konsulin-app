---
title: Combobox Sheet Suspends Host Drawer
description: Mobile combobox sheets suspend the host AppDrawer instead of stacking on top of it
status: accepted
date: 2026-08-30
---

# Context

The mobile combobox renders as a bare vaul `Drawer` sheet (not
`AppDrawer`) so the one-open-at-a-time drawer registry never closes
the host drawer. Originally the sheet stacked above an open parent.
That left an edge-to-edge search bar, a short sheet glued to the
bottom edge for few options, and a double-dimmed backdrop.

# Decision

- The combobox stays on the raw vaul primitive. Deriving it from
  `AppDrawer` was rejected: the registry would really close the host
  (unmounting the sheet), and the opinionated CTA/header contracts do
  not fit a search-only sheet.
- `AppDrawer` becomes a suspendable host. A `useAppDrawerHost`
  context exposes `suspend()`/`resume()`. The combobox calls
  `suspend()` while its mobile sheet is open and `resume()` on close.
- Suspended means visually hidden (`translate-y-full`, no overlay)
  while children stay mounted, so host filter/form state survives the
  round trip. The panel slides via vaul's base transform transition.
- The sheet gets a `min-h-[40dvh]` floor so short option lists rest
  mid-screen instead of hugging the bottom edge.

# Impact

- Nesting reads as a swap: only the top sheet is visible, no double
  overlay, host state preserved automatically.
- The registry and one-open-at-a-time rule are untouched; suspension
  is opt-in via context and a no-op outside an AppDrawer.
- Cost: two hidden-state paths (suspended vs closed) and a third
  `hideOverlay` escape hatch on `DrawerContent`.
