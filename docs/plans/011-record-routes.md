---
title: Record Routes Migration
description: Timeline PHR with progressive HTMX loading
date: 2026-05-26
---

# Overview

Migrate `/record*` routes from Next.js to Go SSR. Personal health record
rendered as a chronological timeline with progressive loading via HTMX
(ADR-011). Initial load shows recent items; older items load on scroll.

# Goals

- `GET /record` shows timeline view of recent health records
- Records grouped by category (conditions, observations, encounters, assessments)
- Progressive loading: HTMX `hx-trigger="revealed"` loads next page
- FHIR: Condition, Observation, Encounter, QuestionnaireResponse
- Paginated with `_count` and `Bundle.link[rel=next]`

# Implementation Steps

- [ ] Create `internal/service/record.go` — fetch timeline items, paginate, group by category
- [ ] Add FHIR types for Condition, Observation, Encounter, QuestionnaireResponse
- [ ] Create `web/template/pages/record/timeline.templ` — timeline container
- [ ] Create `web/partials/record/timeline-item.templ` — single entry with category badge
- [ ] Create `web/partials/record/load-more.templ` — HTMX trigger for next page
- [ ] Create `internal/handler/record.go` — timeline handler with pagination
- [ ] Register routes: `GET /record`, `GET /partials/record/timeline-page`
- [ ] Write `internal/service/record_test.go` — mock FHIR bundle, test pagination and grouping

# Reference

@src/app/record/page.tsx:

- Records listing: role-based dispatch to patient-record or practitioner-record
- Reimplement: same role dispatch in Go handler

@src/app/record/patient-record.tsx:

- Patient record list: fetches via useRecordSummary, displays by category
- Reimplement: Timeline PHR with HTMX progressive loading (hx-trigger="revealed")

@src/app/record/practitioner-record.tsx:

- Practitioner's patient record view: filtered with SOAP entries
- Reimplement: same practitioner-specific queries in Go

@src/services/api/record.tsx:

- Record API: useRecordSummary, useFilterRecordByDate, useGetSingleRecord
- Reimplement: FHIR batch Bundle queries (Observation LOINC 51855-5, 67855-7, QuestionnaireResponse)

@src/app/record/[recordId]/page.tsx:

- Record detail: dispatches to assessment/soap/exercise/journal by category
- Reimplement: same category-based detail dispatch

@src/types/record.ts:

- IRecord, ISoapSection, IJournal, IBundleResponse
- Reimplement: same fields as Go structs

@src/constants/record.ts:

- typeMappings: Patient Note → Self Journal, QuestionnaireResponse → Assessment, Practitioner Note → SOAP
- Reimplement: same mapping table in Go

@src/app/record/record-filter.tsx:

- Record filter: date range, category filter
- Adapt: HTMX partial with date inputs replaces React filter

@src/components/icons/note-icon.tsx:

- NoteIcon — used in record detail pages (imported directly, not via icons/index.tsx)
- Reimplement: inline SVG in templ partial

@public/icons/note.svg:

- Record entry icon
- Reimplement: static asset from web/static/

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                  |
| ------------------------------------------ | ---------- | ------ | ----------------------------------------------------------- |
| Large FHIR bundle overwhelms mobile memory | High       | High   | Use `_count=10`; never load full history client-side        |
| Timeline ordering across resource types    | Medium     | Medium | Sort by `resource.meta.lastUpdated` descending across types |

# UAT

1. Visit `/record` — shows 10 most recent records in timeline
2. Scroll to bottom — next 10 load via HTMX
3. Records grouped by category (lab results, encounters, assessments)
4. Older months loaded on continued scroll
