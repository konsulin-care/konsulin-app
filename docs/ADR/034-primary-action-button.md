---
title: Primary Action Button
description: One action-variant button per screen, placed inside its card on the home and study pages instead of the page action bar
status: accepted
date: 2026-06-03
---

# Context

ADR 032 moved the page primary action out of the nav and into a sticky
`ContentActionBar` inside `<main>`, mirrors on phones through the FAB. Pages
claim that action by dispatching `SET_ACTION` to the FAB context.

The research rebuild changed two surfaces:

- The participant home is a catalogue. It has no single page-wide action;
  every study card offers its own next step. A global action bar reads as a
  navigation control and competes with the cards.
- The study page has one clear next step (join, continue, view findings or
  the referral notice), and that step belongs to the study summary card, not
  to a bar pinned to the viewport.

Keeping `SET_ACTION` on these two surfaces would put the action back in the
FAB/action-bar machinery that ADR 032 introduced for other pages.

# Decision

**One action-variant button per screen.** The home and study pages render at
most one `Button variant='action'`. The action variant is the turquoise fill
with a `turquoise-deep` border, `charcoal-900` text, `rounded-lg`, minimum
height 44px (`min-h-11`) and an optional leading icon. It is the same visual
weight as the FAB's desktop action, so the primary action looks the same
wherever it lives.

**Inside the card.** On both pages the action button sits inside the card it
acts on: the study summary card on the study page and the relevant card on
the home page. It scrolls with the content and never sticks to the viewport.

**No `SET_ACTION` there.** Neither page dispatches `SET_ACTION`. They do not
register a `ContentActionBar` action and do not drive the FAB action mode, so
unmounting them needs no null cleanup and the action cannot jump to the bar
when the shell re-renders. Other pages keep ADR 032 behaviour unchanged.

**Why one.** A screen with a single action cannot present two equally
weighted turquoise buttons. Card-level links and secondary actions stay
outline or ghost buttons; only the one primary step uses the action variant.

**Amendment.** ADR 036 lets secondary card buttons on the researcher manage
page use the charcoal `default` variant instead of outline or ghost. The
single turquoise action-variant rule is unchanged.

# Impact

- The home and study pages are self-contained: their action is visible in
  the content, not in the shell, and survives without FAB context.
- Design tokens allow the turquoise fill in one more place. The "Solid
  turquoise" rule in `@docs/agents/design-tokens.md` now names the action
  variant alongside the FAB.
- Any new screen that adds a second action-variant button breaks this rule;
  prefer outline buttons for secondary actions.
- ADR 032 still governs the action bar and FAB for every other page.
