---
title: Gradient Avatar with Teal Swirls
description: Replace flat-color avatar placeholder with programmatic SVG gradient featuring teal gradients, brand partner colors, and subtle bezier swirl patterns
date: 2026-06-06
---

# Overview

Replace the flat HSL-based color avatar placeholder with a deterministically-generated SVG data URL. When no profile photo exists, the Avatar component renders an inline SVG featuring a linear gradient from brand teal (`#13c2c2`) to a partner brand color, subtle white bezier-curve "swirl" overlays, and the user's initials. Each user gets a unique combination of gradient direction, partner color, and swirl pattern based on a seed hash.

# Goals

- Teal-based linear gradient with 1 of 3 partner brand colors per user (dark charcoal `#2c2f35`, blue-gray `#5E81AC`, darker teal `#08979C`)
- 8 possible gradient directions (L-R, R-L, T-B, B-T, 4 diagonals)
- Subtle "swirly" aesthetic via 2-3 semi-transparent bezier path overlays
- Minimal caller changes: Avatar component self-contains SVG generation, callers add one `seed` prop

# Implementation Steps

- [x] Research current avatar implementation and brand colors
- [ ] Create `src/utils/gradientAvatar.ts` — SVG generation utility with deterministic hash, direction/color selection, and swirl path generation
- [ ] Modify `src/components/general/avatar.tsx` — add `seed` prop, generate SVG data URL when no `photoUrl`, render via `<Image>`, fall back to existing `<div>` when neither is available
- [ ] Modify `src/utils/helper.tsx` — return `seed` from `generateAvatarPlaceholder` for caller convenience
- [ ] Update 12 callers to pass `seed` prop to `<Avatar>`
- [ ] Run tests

# Risks

| Risk                                    | Likelihood | Impact | Mitigation                                   |
| --------------------------------------- | ---------- | ------ | -------------------------------------------- |
| SVG data URL fails in `<Image>`         | Low        | High   | Fall back to flat-color `<div>` on `onError` |
| Deterministic collisions (same avatar)  | Low        | Med    | Use full seed string (id+name+email)         |
| Swirl paths unattractive at small sizes | Med        | Low    | Test at 40px; fine-tune if needed            |

# UAT

1. User without profile picture sees gradient avatar with teal gradient, initials, and subtle swirls
2. Gradient direction varies per user
3. Partner color varies per user from the 3 brand colors
4. Same user sees same avatar on refresh (deterministic)
5. User with real profile picture sees their uploaded photo unchanged
6. Avatar renders correctly at 40px, 60px, 80px, 100px
