---
title: Recommendation Interview & Red-Flag Safety Path
description: Clinical governance handoff — decision tree, red-flag detection, non-blocking nudge, hotlines
status: active
date: 2026-06-03
---

# Recommendation Interview & Red-Flag Safety Path

Handoff doc for clinical governance. Covers the smart structured interview and
how safety red flags surface.

## Source of truth

- Decision tree: `@src/constants/recommendation-decision-tree/`
- Mapping utils: `@src/utils/recommendation-interview.ts`
- Interview UI: `@src/components/general/home/interview/`

The tree is the single source of truth. Seven ICF domains map to chief
complaints, target `serviceTypeCode`, and a red-flag node. No complaint labels
are duplicated elsewhere.

## Red-flag design

- Each complaint carries `redFlag: { isEmergency, label, resources }`.
- Red flag checked only on screening screen 2 of the interview.
- A positive answer shows the emergency banner. It never blocks booking.
- Booking continues after the user acknowledges the nudge.

Rationale: safety nudge without a hard gate. Hard blocks risk friction and
false negatives when users under-report. Clinical review can relax or tighten
this later.

## Hotlines

- Medical / pain emergencies: ER line 112 (tap-to-call `tel:` deep link).
- Mental-health crisis: Kemenkes line 119 then extension 8, deep link to
  WhatsApp 0812-7191-1132.

All calls are deep links, single tap. No modals.

## Other mapping

- User-selected `Other` maps best-effort to a generic `other-{domain}`
  service code.
- No `Other` without free-text mapping exists in the tree.

## Ordering

Relevance then closest slot decide ranking. Distance is the final tiebreak.
`distanceKm` is optional in the API contract; null distance sorts last.

## Governance notes

- Red-flag copy is clinical. Amend only via clinical review, not ad-hoc.
- Hotline numbers verified against Kemenkes guidance; re-verify on rotation.
- The BFF (`GET /api/recommendations`) is undefined here — this is the
  frontend contract handoff. See `@src/types/recommendation.ts`.

## Status

Draft for clinical governance review.
