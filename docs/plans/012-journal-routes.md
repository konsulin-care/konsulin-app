---
title: Journal Routes Migration
description: Notes CRUD with HTMX forms
date: 2026-05-26
---

# Overview

Migrate `/journal*` routes from Next.js to Go SSR. Journal entries are
stored as FHIR Observation resources with LOINC code `51855-5` ("Patient
Note"). CRUD with HTMX-powered forms for create, edit, and delete.

# Goals

- `GET /journal` lists journal entries with HTMX pagination
- `GET /journal/new` renders create form
- `POST /journal` creates new entry as FHIR Observation (LOINC 51855-5)
- `GET /journal/:id/edit` renders edit form
- `POST /journal/:id` updates entry (status: `amended`)
- `POST /journal/:id/delete` deletes entry
- HTMX partial updates for list refresh after mutations

# FHIR Observation Mapping

| Journal Field | FHIR Observation Field                                                                        |
| ------------- | --------------------------------------------------------------------------------------------- |
| Title         | `valueString`                                                                                 |
| Body text     | `note[]` (array of `{text: string}`)                                                          |
| Date          | `effectiveDateTime`                                                                           |
| Status        | `status` (`"final"` create, `"amended"` edit)                                                 |
| Type          | `code.coding[0]` = `{ system: "http://loinc.org", code: "51855-5", display: "Patient Note" }` |
| Owner         | `subject.reference` = `Patient/{fhirId}`                                                      |
| Author        | `performer[].reference` = `Patient/{fhirId}`                                                  |

# Implementation Steps

- [ ] Create `internal/service/journal.go` — CRUD via FHIR Observation endpoints
- [ ] Create `web/template/pages/journal/list.templ` — entry list
- [ ] Create `web/template/pages/journal/form.templ` — create/edit form
- [ ] Create `web/template/partials/journal/entry.templ` — single entry partial
- [ ] Create `internal/handler/journal.go` — list/create/edit/delete handlers
- [ ] Register routes: `GET /journal`, `GET /journal/new`, `POST /journal`, `GET /journal/{id}/edit`, `POST /journal/{id}`, `POST /journal/{id}/delete`
- [ ] Journal list queries: `GET /fhir/Observation?patient={id}&code=http://loinc.org|51855-5`
- [ ] Write `internal/service/journal_test.go` — mock FHIR, test Observation CRUD

# Reference

@src/app/journal/page.tsx:

- Journal page: renders header + CreateJournal component
- Reimplement: same page layout in templ

@src/components/journal/create.tsx:

- Create journal: builds Observation payload with LOINC 51855-5, POST to /fhir/Observation
- Reimplement: same Observation construction (valueString, note[], effectiveDateTime, code.coding, subject, performer)

@src/components/journal/edit.tsx:

- Edit journal: fetches Observation by ID, updates with status="amended"
- Reimplement: same PUT /fhir/Observation/{id} logic in Go

@src/services/api/record.tsx (useSubmitJournal, useUpdateJournal):

- Journal API: POST /fhir/Observation, PUT /fhir/Observation/{id}
- Reimplement: same FHIR endpoints in Go service layer

@src/types/record.ts (IJournal):

- Journal type: valueString, note[], effectiveDateTime, status, code.coding, subject, performer
- Reimplement: same fields as Go struct

@src/app/record/[recordId]/record-journal.tsx:

- Journal entry display: title (valueString), body (note[]), date (effectiveDateTime)
- Reimplement: same display in templ partial

# Risks

| Risk                                        | Likelihood | Impact | Mitigation                                            |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| HTMX form submission with validation errors | Low        | Medium | Return form fragment with inline errors via hx-target |

# UAT

1. Visit `/journal` — entry list shows with dates
2. Click "New Entry" — form renders
3. Submit entry — list refreshes, new entry appears
4. Edit entry — form pre-fills, save updates entry
5. Delete entry — entry removed from list
