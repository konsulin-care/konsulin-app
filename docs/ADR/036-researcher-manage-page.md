---
title: Researcher Manage Page
description: A dedicated researcher study manage page that owns the composer, share, edit and export actions
status: accepted
date: 2026-11-27
---

# Context

The researcher home study card had three equal-weight actions and exposed
the raw study URL. It was unclear which action mattered. The finding
composer opened far from its trigger with no feedback, and share, edit and
export had no home at all.

The home page therefore mixed at-a-glance information with management
actions that belong to a single study. The actions need a stable, linkable
destination that can grow without crowding the study catalogue.

# Decision

**Route and guard.** The manage page lives at `/research/manage?id=`. The
static export keeps the study id in a query parameter. The page uses the
same researcher-only guard as `@src/app/research/edit/page.tsx` and reads
its data from the researcher dashboard query, selecting the study by `?id`.

**A page, not a drawer.** ADR 018 standardises drawers for focused tasks,
but the manage surface needs a directly linkable address and room for the
export section. A full page also mirrors the participant study page layout
(`grid gap-6 lg:grid-cols-3`, main column `lg:col-span-2`).

**The home card is at-a-glance.** It shows the sponsor and title, a status
chip, batch segments and participant progress, followed by one full-width
charcoal "Manage study" link. It shows no raw URL and no competing actions.

**Status rule.** `researcherStudyStatus` uses the first match that applies:

1. `finding-due`: a batch ended before today and no finding was posted
   after that batch ended. This mirrors `nextResearcherStep`.
2. `open`: a batch spans today; the chip carries the closing date.
3. `upcoming`: the next batch starts after today; the chip carries the
   opening date.
4. `finished`: none of the above.

**The composer moves here.** The finding composer leaves the home page.
Home section 03 "What you have given back" becomes a read-only list, and the
next-step card links to `/research/manage?id=X#finding`.

**Manage cards.** Overview (no button), Findings (composer plus this
study's findings, `id='finding'`), Share, Edit and Export. Each card owns a
single button.

**One turquoise action.** Per ADR 034 exactly one `Button variant='action'`
appears per screen: "Post to participants" when the status is finding-due,
otherwise "Copy link". Every other button uses the charcoal `default`
variant. On phones the card holding the turquoise action follows Overview.

**No shell action.** The page dispatches no `SET_ACTION` and registers no
FAB action (ADR 032/034). It uses design tokens only (ADR 026).

**Share link.** Share shows the absolute `window.location.origin +
'/study?id=' + id` as a link that opens the study page; "Copy link" copies
that absolute URL to the clipboard and confirms with "Link copied.".

**Export is a placeholder.** The Export card shows a "Export data" button
that reveals an inline `role=status` coming-soon banner. Export format and
anonymisation are deferred to a future ADR.

# Impact

- The home and manage tests change; the composer and its feedback now live
  on the manage page.
- The en and id research messages grow with the new page strings.
- This ADR amends ADR 034: secondary card buttons on the manage page use
  the charcoal `default` variant, while the single turquoise action rule
  still holds.
