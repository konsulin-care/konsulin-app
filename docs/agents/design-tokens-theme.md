---
title: Design Tokens Theme Block
description: Where the Tailwind v4 theme lives and what the build verification showed
date: 2026-11-13
---

# Overview

The `@theme` block and its base rules live in `@/src/styles/globals.css`. That
file is the source of truth; this document does not copy it.

Compiled with tailwindcss 4.3.3 against `src/` at `41710bc`: dead theme classes
drop from 52 to 3, dead animation classes drop from 36 to 0, and border
utilities take effect.

Token meaning and rules: `@docs/agents/design-tokens.md`.

# What the file defines

- The three-hue palette and its semantic aliases as `--color-*` tokens.
- The animations `pill-in`, `overlay-in`, `marquee`, `accordion-down` and
  `accordion-up`.
- A `@layer base` block that sets the default border colour and the body
  background and foreground.
- Legacy `:root` aliases still read by inline styles; plan 032 removes them.

# Notes

- Do not define radius tokens. Tailwind v4 defaults give `rounded-lg` 8px and
  `rounded-xl` 12px, which is what the app renders today.
- Opacity modifiers such as `hover:bg-destructive/90` work with these tokens.
