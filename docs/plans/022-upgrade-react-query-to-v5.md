---
title: Upgrade React Query to v5
description: Upgrade React Query to v5
status: { { status } }
date: 2026-07-29
---

# Overview

The app's `@tanstack/react-query` v4.42.0 is incompatible with `@aehrc/smart-forms-renderer`'s bundled v5.101.4, causing the assessment page to crash when rendering SNOMED autocomplete items. Upgrade the app to v5 to align versions and share a single React Query context.

# Goals

- Unblock assessment page with open-choice autocomplete items
- Single shared `@tanstack/react-query` v5 instance between app and renderer
- Preserve all existing query/mutation behavior
- Zero regressions in existing tests

# Implementation Steps

- [ ] **Step 1: Write failing test for SmartFormShell context** — Render a component that requires `useQueryClient` from v5 inside SmartFormShell and assert it doesn't throw
- [ ] **Step 2: Upgrade package.json** — Change `@tanstack/react-query` from `^4.40.1` to `^5.90.5` and run npm install
- [ ] **Step 3: Fix TypeScript compilation** — Fix `isLoading` to `isPending` in src/hooks/ and src/services/hooks/
- [ ] **Step 4: Fix mutation onSuccess callbacks** — Refactor `src/services/api/record.tsx` (3 mutations) to use `mutateAsync` + `.then()`
- [ ] **Step 5: Fix mutation onError callback** — Refactor `src/services/api/assessment.tsx` (1 mutation) to use `mutateAsync` + try/catch
- [ ] **Step 6: Fix keepPreviousData** — Update `src/services/hooks/usePractitionerDashboard.ts` to use `placeholderData: keepPreviousData`
- [ ] **Step 7: Fix SmartFormShell provider** — Update `src/components/general/smart-form-shell.tsx` to remove `as unknown as QueryClient` cast
- [ ] **Step 8: Run full test suite and fix failures**
- [ ] **Step 9: Run ESLint quality gate**

# Risks

| Risk                                                                | Likelihood | Impact | Mitigation                                                                                  |
| ------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| `isPending` semantics differ from `isLoading` (no data vs fetching) | Medium     | Medium | Audit each usage — most are loading spinners where `isPending` is correct                   |
| `keepPreviousData` function import path changes                     | Low        | Low    | Import `keepPreviousData` as a function from v5                                             |
| Mutation refactor breaks error handling                             | Low        | High   | Existing `try/catch` already handles errors; `onSuccess` → `.then()` preserves invalidation |
| Existing tests use v4 mock patterns                                 | Low        | Low    | Update mocks if needed; most mock the entire service layer anyway                           |

# UAT

1. Visit `/assessments?id=snomed` — page loads without "No QueryClient set" error
2. Open-choice autocomplete field renders and searches SNOMED CT
3. Journal CRUD operations create, update, delete with proper cache invalidation
4. Practitioner dashboard month/day navigation renders correctly
5. `npm run typecheck` passes with zero errors
6. `npm test` passes
7. `npx eslint --max-warnings 5 src/` passes with no new errors

This plan implements @docs/specs/018-\*.md
