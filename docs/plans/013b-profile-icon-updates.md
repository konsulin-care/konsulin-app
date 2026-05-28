---
title: Profile Icon Updates
description: Replace generic settings icon with dedicated icons for Delete Account and Logout
date: 2026-05-27
---

# Overview

The Delete Account and Logout buttons in the profile settings menu both use the same generic `/icons/settings.svg` icon. Replace them with dedicated icons to improve UX clarity:

- **Delete Account**: trash can icon (`/icons/delete-account.svg`)
- **Logout**: door/arrow exit icon (`/icons/logout.svg`)

# Goals

- Add two new SVG icon assets to `web/static/`
- Update profile settings component to use dedicated icons per menu item
- Delete Account and Logout are visually distinct from other menu items

# Implementation Steps

- [ ] Create `web/static/icons/delete-account.svg` — trash can icon (24x24, stroke-width 1.5, matches existing icon style)
- [ ] Create `web/static/icons/logout.svg` — door with arrow icon (24x24, same style)
- [ ] Update `web/template/partials/profile/settings.templ` — map `item.id` to icon path instead of using one generic icon
- [ ] Verify: Delete Account shows trash icon, Logout shows door icon

# Reference

@src/components/profile/settings.tsx (lines 72-80):

- All menu items render the same generic `/icons/settings.svg` icon
- Icon is rendered via `<Image src={item.icon || '/icons/settings.svg'} ...>`
- Adapt: add icon field to menu items in Go template, render per-item

@src/constants/profile.ts (lines 45-46):

- Delete Account: `{ name: 'Delete Account', link: '/remove-account' }`
- Logout: `{ name: 'Log out', link: '/logout' }`
- Reference: icon assignment lives in the template rendering, not the constant

@public/icons/settings.svg:

- Current generic icon used by both buttons
- Keep: still valid for other settings menu items

# Risks

| Risk                                   | Likelihood | Impact | Mitigation                                                  |
| -------------------------------------- | ---------- | ------ | ----------------------------------------------------------- |
| SVG style mismatch with existing icons | Low        | Medium | Match stroke-width (1.5), color currentColor, 24x24 viewBox |

# UAT

1. View profile settings — Delete Account shows trash can icon
2. View profile settings — Logout shows door/arrow icon
3. Other menu items still show their existing icons
