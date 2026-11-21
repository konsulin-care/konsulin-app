---
title: Design Tokens
description: Three-colour palette, token roles, contrast rules, and the mapping from legacy colours
date: 2026-11-13
---

# Overview

Three hues: charcoal (foreground), pale white (background), turquoise (accent).
Red is reserved for error and delete. Amber is reserved for warning.
Design language: Swiss Modernism 2.0, softened. Grid, hairlines, one accent,
8px radius, Plus Jakarta Sans only.

Source of truth: the `@theme` block in `@/src/styles/globals.css`.
Theme block overview: `@docs/agents/design-tokens-theme.md`.

Non-CSS consumers (the MUI renderer theme, the SuperTokens sign-in style, the
top loader) read hex from `@src/styles/tokens.ts`, kept in sync with
`globals.css` by `tokens.test.ts`. Button `secondary` is a bordered surface
button, never a turquoise fill.

# Tokens

Contrast is against `paper`. Text needs 4.5, controls and icons need 3.0.

| Token            | Hex       | Contrast | Role                                         |
| ---------------- | --------- | -------- | -------------------------------------------- |
| `charcoal-900`   | `#161C26` | 16.36    | Body text, headings, primary buttons         |
| `charcoal-700`   | `#484D54` | 8.15     | Secondary text; text on tint or muted fills  |
| `charcoal-600`   | `#686C72` | 5.05     | Captions, placeholders; lightest text step   |
| `charcoal-400`   | `#8D8F93` | 3.10     | Input borders, inactive icons; never text    |
| `charcoal-200`   | `#DADBDB` | 1.33     | Hairline dividers                            |
| `charcoal-100`   | `#ECEDEB` | 1.12     | Tracks, disabled and muted fills             |
| `paper`          | `#FAFAF8` | n/a      | Page canvas                                  |
| `surface`        | `#FFFFFF` | 1.05     | Cards, sheets, popovers                      |
| `turquoise`      | `#0ABDC3` | 2.21     | FAB fill only; charcoal-900 on it is 7.39    |
| `turquoise-tint` | `#D8F1F1` | 1.13     | The trail: selected, completed, active       |
| `turquoise-deep` | `#0F7981` | 4.93     | Links, focus and selected rings, progress    |
| `danger`         | `#B3261E` | 6.25     | Error text, delete buttons; white on it 6.54 |
| `danger-tint`    | `#FBEAE8` | 1.11     | Error banner fill                            |
| `warning`        | `#F2B705` | 1.74     | Warning icon fill; charcoal-900 on it 9.40   |
| `warning-deep`   | `#7A5200` | 6.62     | Warning text, icon, border                   |
| `warning-tint`   | `#FDF3D7` | 1.06     | Warning banner fill                          |

# Semantic Aliases

`components/ui` uses these names. Prefer them over the ramp in components.

| Alias                       | Maps to                                      | Foreground alias                      |
| --------------------------- | -------------------------------------------- | ------------------------------------- |
| `background`                | `paper`                                      | `foreground` = charcoal-900           |
| `card`, `popover`           | `surface`                                    | `*-foreground` = charcoal-900         |
| `primary`                   | `charcoal-900`                               | `primary-foreground` = paper          |
| `secondary`                 | `turquoise`                                  | `secondary-foreground` = charcoal-900 |
| `accent`                    | `turquoise-tint`                             | `accent-foreground` = charcoal-900    |
| `muted`                     | `charcoal-100`                               | `muted-foreground` = charcoal-600     |
| `destructive`               | `danger`                                     | `destructive-foreground` = surface    |
| `border` / `input` / `ring` | charcoal-200 / charcoal-400 / turquoise-deep | n/a                                   |

# Rules

- Solid turquoise fills the FAB and its desktop button. Nothing else.
- Never put white text on turquoise. Never use turquoise for text or thin lines.
- Tint marks the trail. Always pair it with a second cue: a `turquoise-deep`
  ring or border, a charcoal check icon, or bold weight.
- `turquoise-deep` is text-safe on `paper` and `surface` only (4.93, 5.16).
  On tint or muted fills it is 4.4, so use it there for rings and icons only.
- `charcoal-600` is text-safe on `paper` and `surface` only. On tint or muted
  fills use `charcoal-700` or `charcoal-900`.
- Separate with hairlines (`border-border`), not shadows. Shadows are for the
  FAB, drawers and popovers.
- Radius: `rounded-lg` (8px) for cards, inputs and buttons. Pills are full.
- Error and delete share `danger`. Warning uses a tint banner with
  `warning-deep` text. Success is tint plus a check icon; there is no green.
- No arbitrary hex in components. No `text-[10px]` or `text-[11px]`; the
  minimum is `text-xs` (12px). Touch targets are at least 44px.

# Legacy Mapping

| Legacy                                                    | Replace with                              |
| --------------------------------------------------------- | ----------------------------------------- |
| `bg-secondary`, `bg-[#13c2c2]` on a button                | `bg-primary text-primary-foreground`      |
| `bg-secondary` on a selected, active or done state        | `bg-accent text-accent-foreground` + ring |
| `bg-secondary`, `var(--secondary)` on a bar or dot        | `bg-turquoise-deep`                       |
| `text-secondary`, `text-[#13c2c2]`, `text-teal-*`         | `text-turquoise-deep`                     |
| `text-white` on turquoise                                 | `text-secondary-foreground`               |
| `#2c2f35`, `text-black`, `#000000`                        | `text-foreground`                         |
| `text-gray-500`, `text-gray-600`, `text-gray-400`         | `text-muted-foreground`                   |
| `text-gray-700`, `text-gray-800`                          | `text-charcoal-700`                       |
| `bg-white`                                                | `bg-card`                                 |
| `#f9f9f9`, `#f8f8f8`, `#f5f5f5`, `#efefef`, `bg-gray-100` | `bg-muted`                                |
| `border-gray-*`, `border-slate-*`, `#e3e3e3`, `#e5e7eb`   | `border-border` (inputs: `border-input`)  |
| `#f5222d`, `#ff0000`, `text-red-*`, `bg-red-*`            | `danger` tokens                           |
| `amber-*`, `#fadb14`, `#fff7e6`                           | `warning` tokens                          |
| `#ebcb8b` (gold halo), `#94A3B8` (score bar)              | `turquoise-deep`, `charcoal-400`          |
| `text-[10px]`, `text-[11px]`                              | `text-xs`                                 |
