---
title: Interpretation Engine
description: Declarative instrument definitions turn scores into verified plain-language readings
status: accepted
date: 2026-11-24
---

# Context

The report currently renders a plain-language reading through the LLM
interpretation hook (result-brief). That hook is being removed. Participants
still need a clear, trustworthy reading of their scores for PHQ-9, GAD-7,
OLBI, RES-8 and WHODAS-12.

Copying prose per instrument into components does not scale and cannot be
tested reliably. LOINC does not solve it either: it covers only PHQ-9 and
GAD-7, so it cannot key the full instrument set. We need one place that maps a
score to a message, with the copy kept separate and reviewable.

# Decision

Build a pure TypeScript interpretation engine in `src/lib/interpretation/`.
It has no app imports and uses only plain, JSON-serialisable definitions, so it
can later be extracted and published to npm.

**Registry**

- Instruments are keyed by a Konsulin instrument Coding:
  `system = https://konsulin.care/fhir/CodeSystem/instrument`, `code` one of
  `phq-9`, `gad-7`, `olbi`, `res-8`, `whodas-12`.
- The registry is a `Map` keyed by `${system}|${code}`.
- LOINC is not used as the key.

**Definitions**

- Each definition declares its scale (inclusive `min` and `max`) and an
  ascending array of bands.
- A band is an inclusive lower bound `min`. The engine picks the last band with
  `min <= value`, so bands read as ascending ranges.
- Values outside `[scale.min, scale.max]` produce no band.
- A definition may declare an optional combine table (OLBI) and optional
  flags and notes.
- Subscales are not computed by the frontend. They come from the
  Questionnaire's `calculatedExpression`, stored in the QuestionnaireResponse.

**Messages**

- The engine returns message keys only. It never holds copy.
- Copy lives in the `interpretation` i18n namespace, one file per locale, with
  en/id parity.
- High bands use supportive, direct, action-oriented copy; low bands use a
  warm, encouraging tone. The crisis line is 119 extension 8 (Kemenkes).

**Isolation**

- The module is isolated and lint-enforced: it may not import app code. This
  keeps the extraction path to an npm package open.

# Impact

- Adding an instrument means writing one definition plus its messages, not new
  component logic.
- Go consumers could read the same JSON-serialisable definitions, keeping
  frontend and backend readings consistent.
- All participant-facing copy moves into reviewed message files, which enables
  clinical review but also requires it before an instrument ships.
- The registry is a single coupling point: a wrong key or band silently drops
  the reading, so definitions need tests per instrument.
- The engine stays free of app dependencies, at the cost of duplicating small
  helpers rather than importing shared app utilities.
