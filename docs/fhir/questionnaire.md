---
title: Questionnaire Authoring Rules
description: Instrument codes, interpretation structure, and linkIds for the Questionnaires the owner edits through the BFF
status: updated
date: 2026-11-24
---

# Overview

These are the Questionnaire authoring rules applied by hand when editing the
study's instruments. The owner posts edits through superadmin access via the
BFF. The interpretation engine and its ranges live in
`@src/lib/interpretation/instruments/`.

# Instrument Code

Every Questionnaire carries `Questionnaire.code` with system
`https://konsulin.care/fhir/CodeSystem/instrument`. The matching CodeSystem is
a public resource in the backend. Publish one CodeSystem with these concepts:

- `phq-9`
- `gad-7`
- `olbi`
- `res-8`: Indonesian RES, 8 items; item 8 "I can handle a lot at the same time" is dropped
- `whodas-12`

# Interpretation Group

- A top-level item `interpretation` holds a group `score-dimension`.
- Each subscale is a calculated item (`calculatedExpression`) with a fixed
  linkId. The frontend never computes subscales.
- Sums use `valueInteger`; means use `valueDecimal`.
- Where a total applies, its linkId is `total`.
- Example structure: `QuestionnaireResponse/DIQLHHMWNAB2O5WG`
  (big-five-inventory) has items `openness`, `conscientiousness` and so on,
  plus `reference`.

# linkIds by Instrument

- `phq-9`: `total` (0-27)
- `gad-7`: `total` (0-21)
- `olbi`: `exhaustion` and `disengagement`, each a mean of its 8 items on 1-4
  after reverse-scoring, as `valueDecimal`
- `res-8`: `total` (0-32) and `self-confidence` (items 1, 7, 9; 0-12)
- `whodas-12`: `total`, the simple sum of 12 items coded 0-4 (0-48)

# Signals

PHQ-9 adds a group `signal` under `interpretation`, with item `self-harm` set
to the ordinal value of item 9 (0-3). Signals are not drawn as score bars.

# Reference Item

The `reference` item is optional. For known instruments the app uses the
ranges in `@src/lib/interpretation/instruments/`, so a wrong reference (e.g.
GAD-7 showing `/6`) no longer matters. Keep it only for unknown instruments.

# Display Names

The `text` of `score-dimension` items is not shown for known instruments;
labels come from the `interpretation` message namespace.

# OLBI Assumption

The app assumes the respondent is working and shows a note saying so.

# Edit Flow

- Edit through the BFF: `/proxy/fhir/Questionnaire/{id}` with superadmin
  access, so the BFF shared cache invalidates Questionnaire entries.
- Edits made directly on the backend stay cached up to 24h, until the BFF
  restarts.
