---
title: Research Home Shell
description: Research becomes the home page and the shell moves the page action into a sticky content action bar
status: accepted
date: 2026-07-21
---

# Context

ADR 031 introduced the responsive app shell: a 96px rail at md, a 240px
sidebar at lg, the page primary action rendered as a rail/sidebar tile, and
"/" as the "Welcome to Konsulin" home.

Three problems surfaced in use:

- Research is the first thing Patient, Guest and Researcher users need, yet it
  lived at `/research` while `/` showed an onboarding greeting.
- The rail tile duplicated the page action inside the nav, so the action moved
  around with the nav layout and read as navigation.
- The rail was wide for an icon-only control, and the page action promised by
  the FAB contract had no sticky home on wide viewports.

This ADR supersedes the rail width, the primary-action placement, the nav
destination list and the `/` route meaning from ADR 031. Everything else in
ADR 031 (CSS-only layout, FAB stays mounted, overlay exception, `PageLayout`,
bare routes, z-index) still holds.

# Decision

**Research is home.** `/` renders `<ResearchPage />` for Patient, Guest and
Researcher. `/` keeps `HomeHeader` + `HomeContent` for Practitioner and Clinic
Admin. The former home moves to `/dashboard`, renders for every role and is
not linked from nav. `/research` stays as an alias for shared links and URL
rewrites stay on the current base path (`/` or `/research`). On `/` for the
research-home roles the header behaves exactly like `/research`: research
title, no upcoming-session card, no research header widget.
`useRedirectIntent`, the loading/redirect spinner and the role-change query
invalidation all stay.

**Narrow icon rail.** From md the rail is 72px and icon-only; labels move into
tooltips. From lg the 240px sidebar keeps icon plus label.

**Sticky content action bar.** The page primary action leaves the nav tile and
renders in a `ContentActionBar` inside `<main>`, sticky to the bottom from md.
Phones keep the FAB as the action surface.

**Action-only pills.** A pill may carry `sidebar?: boolean`. Pills whose only
job is an action (`pill_join_research`, `pill_get_recommendation`,
`pill_my_survey`) are removed from the nav; `pill_register_survey` stays in the
mobile FAB but is hidden from the sidebar via `sidebar: false`.

# Impact

- Researchers and patients land on the work they came for; `/dashboard` keeps
  the old home reachable for everyone.
- Two routes render home-like content, so role-based branching on `/` must stay
  explicit and tested.
- The nav no longer owns the primary action; pages dispatch it through
  `ContentActionBar`. Action-only pills can no longer be reached from the
  sidebar.
- A 72px icon-only rail needs tooltips for discoverability and relies on the
  `--shell-offset` variable from ADR 031 for the new md width.
- ADR 031 stays the reference for the shell skeleton, overlays and layout
  primitives; this ADR only changes the items listed above.
