---
title: Record Pages — React SPA
description: Timeline PHR with React Query infinite scroll
date: 2026-06-05
---

# Overview

Before implementing, read @docs/wiki/001-pages-routes.md for route patterns and @docs/wiki/004-state-management.md for current data fetching patterns.

Rewrite `/record*` as Next.js React SPA pages. Personal health record
rendered as a chronological timeline with progressive loading via React
Query `useInfiniteQuery` (ADR-011). Initial load shows recent items;
older items load on scroll via Intersection Observer. No Go SSR.
Aligned with ADR-015.

# Goals

- `GET /record` — timeline view of recent health records via `useInfiniteQuery`
- Records grouped by category (conditions, observations, encounters, assessments)
- Progressive loading: Intersection Observer triggers `fetchNextPage`
- FHIR: Condition, Observation, Encounter, QuestionnaireResponse
- Paginated with `_count` and `Bundle.link[rel=next]`

# Implementation Steps

- [ ] Create `@/record/page.tsx` — role-dispatch timeline with `useInfiniteQuery`
- [ ] Create `@/record/page.tsx` — record detail (category-dispatch: assessment/soap/journal, detail via `useSearchParams`)
- [ ] Add React Query hooks: `useRecords(patientId)`, `useRecordDetail(id)`
- [ ] Implement infinite scroll — Intersection Observer on sentinel element triggers `fetchNextPage`
- [ ] Group records by category client-side (`resource.resourceType` mapping)
- [ ] Add category filter (React state) — conditions, observations, encounters, assessments
- [ ] Write `@/record/__tests__/record.test.tsx` — mock FHIR bundle, test pagination and grouping

# Reference

@@/record/page.tsx:

- Records listing: role-based dispatch to patient-record or practitioner-record
- Keep: same role dispatch in React SPA
- Adapt: replace manual pagination with `useInfiniteQuery`

@@/record/patient-record.tsx:

- Patient record list: fetches via useRecordSummary, displays by category
- Keep: same data display; adapt to `useInfiniteQuery` pattern

@@/record/practitioner-record.tsx:

- Practitioner's patient record view: filtered with SOAP entries
- Keep: same practitioner-specific queries

@@/services/api/record.tsx:

- Record API: useRecordSummary, useFilterRecordByDate, useGetSingleRecord
- Adapt: wrap with React Query hooks using `/proxy/fhir/` base path

@@/record/[recordId]/page.tsx:

- Record detail: dispatches to assessment/soap/exercise/journal by category
- Keep: same category-based detail dispatch

@/types/record.ts:

- IRecord, ISoapSection, IJournal, IBundleResponse
- Keep: same TypeScript types

@/constants/record.ts:

- typeMappings: Patient Note → Self Journal, QuestionnaireResponse → Assessment, Practitioner Note → SOAP
- Keep: same mapping table in TypeScript

@@/record/record-filter.tsx:

- Record filter: date range, category filter
- Keep: React component with date inputs; adapt fetch to use filter params

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                  |
| ------------------------------------------ | ---------- | ------ | ----------------------------------------------------------- |
| Large FHIR bundle overwhelms mobile memory | High       | High   | Use `_count=10`; never load full history client-side        |
| Timeline ordering across resource types    | Medium     | Medium | Sort by `resource.meta.lastUpdated` descending across types |

# UAT

1. Visit `/record` — shows 10 most recent records in timeline
2. Scroll to bottom — next 10 load via infinite scroll
3. Records grouped by category (lab results, encounters, assessments)
4. Older months loaded on continued scroll
