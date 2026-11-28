---
title: Hidden Scrollbars
description: Hide native scrollbars and replace them with overlay thumb and edge fades
status: accepted
date: 2026-11-27
---

# Context

The product wants a minimalist visual design. Native scrollbars are drawn by
the platform in a chrome-like grey that clashes with the charcoal and paper
palette and adds visual noise to every list, sheet and drawer.

The first attempt mixed two mechanisms: `html { scrollbar-gutter: stable }`
reserved a permanent gutter, while Radix modal menus applied their own scroll
lock. Opening the avatar menu then shifted the whole layout sideways by the
gutter width, because the lock removed the reserved space the page had already
laid out against.

Options considered:

- Style the native scrollbar: not portable across Chrome, Safari and Firefox,
  and still reserves a gutter.
- Keep `scrollbar-gutter: stable` and accept the shift: visible layout jump on
  every modal menu, which is exactly the polish we are trying to remove.
- Hide every scrollbar and add non-obstructive indicators: scroll position and
  affordance stay discoverable without any reserved space.

# Decision

Hide scrollbars globally and replace them with lightweight indicators.

**Global hiding**

- `* { scrollbar-width: none }` and `*::-webkit-scrollbar { display: none }`
  in `src/styles/globals.css`, inside `@layer base` so border and background
  utilities keep their specificity.
- Remove `html { scrollbar-gutter: stable }`. Nothing reserves a gutter, so no
  container can shift when a scroll lock removes one.

**Page overlay indicator**

- A fixed 3px thumb (`src/components/scroll-indicator.tsx`, `data-testid`
  `scroll-indicator`) tracks the document scroll position.
- Colour `bg-charcoal-400/50`, `pointer-events-none`, `aria-hidden` and
  outside the tab order, so it never intercepts clicks or focus.
- Shown while scrolling, fades out 800ms after the last scroll event
  (`useScrollIndicator`, `HIDE_DELAY_MS`).
- `motion-reduce:transition-none` keeps the state change instant and motion
  free when the user prefers reduced motion.
- Renders nothing when the page does not overflow the viewport.

**Edge fades for inner containers**

- `useScrollEdges` sets `data-scroll-fade` plus `data-fade-top/bottom/left/right`
  per overflowed edge; the CSS mask in `globals.css` fades only those edges by
  24px.
- Applied to `ScrollArea` viewports and `AppDrawer` bodies. New scroll
  containers should opt into the same hook rather than invent their own mask.

**Radix ScrollArea**

- `type='scroll'`, so the component does not depend on a hover state to reveal
  the bar.
- 3px track and thumb, thumb `bg-charcoal-400/50`, matching the page overlay.

**Avatar menus**

- The role switch dropdown and the sidebar account menu use `modal={false}`.
  No scroll lock is installed, so no margin or gutter compensation runs and
  the layout stays put while a menu is open.

# Impact

- Mouse users lose the platform scrollbar as a draggable target and as a
  position read-out. The overlay thumb restores the position cue on the page,
  and the edge fades show that an inner container still has content. Precision
  dragging is no longer possible; users scroll with the wheel or trackpad.
- Keyboard scrolling, touch scrolling and screen-reader semantics are
  unchanged: hiding the bar is purely visual and no element becomes hidden
  from assistive technology.
- Layouts no longer reserve space for a scrollbar, so widths are honest and
  no scroll lock can shift them. Centering calculations can drop the classic
  scrollbar offset.
- Every new scroll container needs an explicit decision: page-level scrolling
  gets the overlay thumb automatically, inner containers should use
  `useScrollEdges` to keep the affordance.
