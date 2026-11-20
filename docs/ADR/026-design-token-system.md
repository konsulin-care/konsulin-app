---
title: Design Token System
description: One @theme block in globals.css is the only source of design tokens
status: accepted
date: 2026-11-13
---

# Context

Tailwind v4 never loaded `tailwind.config.ts`. Theme and animation
classes came from that file, so they emitted no CSS at all: `bg-primary`,
`text-muted-foreground` and friends were dead strings in the markup. Two
more faults compounded it. An unlayered `border-color` rule in
`src/styles/index.scss` overrode border utilities. A second Tailwind
emission from the same Sass entry loaded after `globals.css` inside the
same base layer, and its preflight `* { border: 0 solid }` reset the
`border-color: var(--color-border)` default, so `border` alone drew a
transparent line.

Options considered: keep `tailwind.config.ts` and upgrade it to a v4
`@config`; move the tokens into a JS/TS file and generate CSS; or declare
the tokens natively in CSS with `@theme`.

# Decision

- One `@theme` block in `@/src/styles/globals.css` is the only token
  source. `tailwind.config.ts` is deleted; no `@config` indirection.
- The palette is the three-hue system documented in
  `@docs/agents/design-tokens.md`: charcoal, pale white paper, turquoise
  accent, plus `danger` and `warning` roles.
- Base rules (reset, border defaults, typography) live in `@layer base`,
  never unlayered, so utilities still win.
- Tailwind is emitted exactly once, from `globals.css`. `index.scss` no
  longer runs its own Tailwind directives and no longer sets a global
  `border-color`.
- Legacy `:root` aliases (`--primary`, `--secondary`, `--soft-gray`,
  `--muted`, `--border`) stay as shims until plan 032 sweeps them.

# Impact

- Previously dead classes render: spacing, colour, radius and animation
  utilities now produce CSS, and `border-border` is the single hairline
  default.
- One file to edit for a token change; no build config to keep in sync
  with the stylesheet, so this class of silent failure cannot recur.
- Cost: tokens are CSS custom properties, not typed JS values, so
  consumers cannot import them. Any runtime need must read the computed
  style.
- The two alias layers overlap until plan 032 removes the legacy names;
  new code must use the semantic aliases only.
