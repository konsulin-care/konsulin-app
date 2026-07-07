---
title: Journal Pages — React SPA
description: Notes CRUD with React Hook Form + React Query
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/006-data-types.md for FHIR type definitions used by journal entries.

Rewrite `/journal*` as Next.js React SPA pages. Journal entries are
stored as FHIR Observation resources with LOINC code `51855-5` ("Patient
Note"). CRUD with React Hook Form for create/edit and React Query
mutations with automatic list invalidation. No Go SSR. Aligned with ADR-015.

# Goals

- `GET /journal` — entry list with `useQuery` pagination
- `GET /journal/new` — create form (React Hook Form)
- `POST /journal` — create via `useMutation` to `/proxy/fhir/Observation`
- `GET /journal/edit?id=<id>` — edit form pre-filled via `useQuery`
- `POST /journal?id=<id>` — update (status: `amended`) via `useMutation`
- `DELETE /journal?id=<id>` — delete via `useMutation`
- List refresh via `queryClient.invalidateQueries` after mutations

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

- [ ] Create `@/journal/page.tsx` — entry list with pagination via `useQuery`
- [ ] Create `@/journal/new/page.tsx` — create form with React Hook Form
- [ ] Create `@/journal/edit/page.tsx` — edit form, pre-filled via `useQuery`
- [ ] Add React Query hooks: `useJournals(patientId)`, `useJournal(id)`, `useCreateJournal()`, `useUpdateJournal()`, `useDeleteJournal()`
- [ ] Observation construction as pure function — build FHIR payload from form values
- [ ] Wire `onSuccess` callbacks: `queryClient.invalidateQueries({ queryKey: ['journals'] })`
- [ ] Write `@/journal/__tests__/journal.test.tsx` — mock fetch, test CRUD flow

# Reference

@@/journal/page.tsx:

- Journal page: renders header + CreateJournal component
- Keep: same page layout in React

@@/components/journal/create.tsx:

- Create journal: builds Observation payload with LOINC 51855-5, POST to /fhir/Observation
- Keep: same Observation construction; adapt to `useMutation('/proxy/fhir/Observation')`

@@/components/journal/edit.tsx:

- Edit journal: fetches Observation by ID, updates with status="amended"
- Keep: same logic; adapt to `useMutation('/proxy/fhir/Observation/{id}')`

@@/services/api/record.tsx (useSubmitJournal, useUpdateJournal):

- Journal API: POST /fhir/Observation, PUT /fhir/Observation/{id}
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@/types/record.ts (IJournal):

- Journal type: valueString, note[], effectiveDateTime, status, code.coding, subject, performer
- Keep: same TypeScript type

@@/record/[recordId]/record-journal.tsx:

- Journal entry display: title (valueString), body (note[]), date (effectiveDateTime)
- Keep: same display in React component

# Risks

| Risk                                   | Likelihood | Impact | Mitigation                                                   |
| -------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Form submission with validation errors | Low        | Medium | Client-side validation before submit; inline error messages  |
| Optimistic update causes stale list    | Low        | Low    | Use `onSettled` invalidation; keep server as source of truth |

# UAT

1. Visit `/journal` — entry list shows with dates
2. Click "New Entry" — form renders
3. Submit entry — list refreshes, new entry appears
4. Edit entry — form pre-fills, save updates entry
5. Delete entry — entry removed from list
