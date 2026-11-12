---
title: Report FAB States
description: The four contextual FAB states on /report, priority order, and the SET_ACTION cleanup rule
status: updated
date: 2026-07-20
---

# Overview

`ReportFab` (`src/app/report/report-fab.tsx`) drives the contextual FAB on
`/report`. It dispatches `SET_ACTION` configs through `useFab()` from
`@/context/fabContext`; guests are handled by the shared `ClaimReportFab`
component instead.

# States in Priority Order

First match wins. Later states are never dispatched when an earlier one
applies.

| #   | State          | Condition                                                     | Label                 | Action                        |
| --- | -------------- | ------------------------------------------------------------- | --------------------- | ----------------------------- |
| 1   | Simpan Laporan | Guest with loaded responses (`isGuest && hasResponses`)       | `report.fab_claim`    | Claim flow → `/auth`          |
| 2   | Lanjutkan      | Patient: current batch open with an uncompleted questionnaire | `report.fab_continue` | Navigate to the questionnaire |
| 3   | Ingatkan Saya  | Patient: a next batch exists (`getNextBatch` > today)         | `Ingatkan Saya`       | Add batch start to calendar   |
| 4   | Ajak Teman     | Any other patient                                             | `Ajak Teman`          | Share the study               |

Details:

- **Simpan Laporan** — `ReportFab` renders `ClaimReportFab`, which saves an
  `assessmentResult` redirect intent and dispatches its own primary
  `SET_ACTION` (BookCheck icon).
- **Lanjutkan** — ClipboardList icon; pushes
  `/assessments?id=<firstUncompletedQuestionnaireId>&study=<studyId>`.
  Only this label is localized; the two patient labels below are fixed.
- **Ingatkan Saya** — CalendarPlus icon; `addToCalendar()` with the next
  batch start date as `startDate`.
- **Ajak Teman** — Share2 icon; `handleShare` from `useShareStudy`.

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
