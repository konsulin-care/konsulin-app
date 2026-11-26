---
title: Report FAB States
description: The four contextual FAB states on /report, the guest save card, back route and SET_ACTION cleanup
status: updated
date: 2026-11-24
---

# Overview

`ReportFab` (`src/app/report/report-fab.tsx`) drives the contextual FAB on
`/report`. It dispatches `SET_ACTION` configs through `useFab()` from
`@/context/fabContext`; guests are handled by the shared `ClaimReportFab`
component instead. The guest save card lives in the page body.

# States in Priority Order

First match wins. Later states are never dispatched when an earlier one
applies.

| #   | State          | Condition                                                     | Label                 | Action                        |
| --- | -------------- | ------------------------------------------------------------- | --------------------- | ----------------------------- |
| 1   | Simpan Laporan | Guest with loaded responses (`isGuest && hasResponses`)       | `report.fab_claim`    | Claim flow → `/auth`          |
| 2   | Lanjutkan      | Patient: current batch open with an uncompleted questionnaire | `report.fab_continue` | Navigate to the questionnaire |
| 3   | Ingatkan Saya  | Patient: a next batch exists (`getNextBatch` > today)         | `report.fab_remind`   | Add batch start to calendar   |
| 4   | Ajak Teman     | Any other patient                                             | `report.fab_share`    | Share the study               |

Details:

- **Simpan Laporan** — `ReportFab` renders `ClaimReportFab`, which saves an
  `assessmentResult` redirect intent and dispatches its own primary
  `SET_ACTION` (BookCheck icon).
- **Lanjutkan** — ClipboardList icon; pushes
  `/assessments?id=<firstUncompletedQuestionnaireId>&study=<studyId>`.
  Every label in this table is localized through the `common` namespace.
- **Ingatkan Saya** — CalendarPlus icon; `addToCalendar()` with the next
  batch start date as `startDate`.
- **Ajak Teman** — Share2 icon; `handleShare` from `useShareStudy`.

# Guest Save Card

Guests with a report also get `ReportSaveCard`
(`src/app/report/report-save-card.tsx`) below the result. The card explains
why saving matters and renders one full-width button, `report.fab_claim`
("Save report"), that runs the shared `useClaimReport` action with
`/report?id=<studyId>` as the post-claim path. The headline comes from
`report.save_headline_next` when another batch follows and
`report.save_headline_last` otherwise. The card is the in-page save button;
the guest FAB state above still routes to `/auth`.

# Back Route

The page header back button on `/report?id=X` targets `/study?id=X`, falling
back to `/studies` when the id is missing. From the study page the back
button targets `/studies`; from `/studies` it targets `/`.

# Cleanup Reset Rule

The FAB is global, so every `/report` effect that dispatches a non-null
`SET_ACTION` must reset it on unmount:

```tsx
useEffect(
  () => () => dispatch({ type: 'SET_ACTION', config: null }),
  [dispatch]
);
```

Without `dispatch({ type: 'SET_ACTION', config: null })` the FAB keeps the
report action after the page unmounts. The guest claim effect intentionally
registers no cleanup of its own — `ClaimReportFab` owns its dispatch and
clears the action itself.

# Related

FAB modes and general wiring: `@docs/agents/fab-patterns.md`.
