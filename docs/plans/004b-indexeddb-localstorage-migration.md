---
title: IndexedDB Schema + localStorage Migration
description: Centralized IndexedDB schema, migrate all localStorage keys
date: 2026-05-27
---

# Overview

Before implementing, read @docs/plans/004a-guest-aware-auth-guard.md for the Go middleware that sets the `guest_session` cookie and @docs/plans/006-offline-error-pages.md for the IndexedDB utility helper.

All 11 localStorage keys from the Next.js frontend must migrate to IndexedDB or cookies. The IndexedDB database uses 7 grouped stores with compound keys. This plan defines the schema upfront so plans 005–014 can import and use it without schema version bumps.

**Moves to cookie:** `konsulin.intent` and `redirect` -> `redirect_intent` cookie (from 004a)
**Moves to IndexedDB:** remaining 9 keys into 7 stores

# Goals

- Define all 7 IndexedDB stores in a single utility file (`src/lib/indexeddb.ts`)
- Migrate all 9 localStorage keys to their corresponding IndexedDB stores
- Replace `konsulin.intent` and `redirect` with `redirect_intent` cookie
- Change `localStorage.clear()` in auth reducer and API interceptor to scoped IndexedDB deletion
- Update plan 006's IndexedDB helper to use this schema

# Implementation Steps

- [ ] Create `src/lib/indexeddb.ts` — IndexedDB schema definition (DB name: `konsulin`, version: 1):
      Stores: - `guest_sessions` (keyPath: `guest_id`) - `assessment_drafts` (keyPath: `[ownerId, questionnaireId]`) - `soap_drafts` (keyPath: `[practitionerId, patientId]`) - `service_requests` (keyPath: `id`) - `temp_booking` (keyPath: `ownerId`) - `ui_preferences` (keyPath: `[ownerId, prefKey]`) - `navigation_state` (keyPath: `[ownerId, stateKey]`)
      Export: `openDB()`, `getStore(db, name, mode)`
- [ ] Update plan 006: its "IndexedDB helper" step becomes `openDB()` upgrade wrapper; schema definition lives here in 004b
- [ ] Migrate `konsulin.guest_id` from localStorage to IndexedDB `guest_sessions` store (keyed by guest_id)
- [ ] Replace `konsulin.intent` reads/writes with `redirect_intent` cookie (set by Go middleware, read by frontend JS via `document.cookie`)
- [ ] Replace `redirect` localStorage key in `src/app/page.tsx` with `redirect_intent` cookie
- [ ] Update `src/context/auth/authReducer.tsx` — change `localStorage.clear()` to scoped IndexedDB deletion (delete only current user's stores)
- [ ] Update `src/services/api.tsx` (401 interceptor) — change `localStorage.clear()` to scoped IndexedDB deletion

# Reference

@src/lib/indexeddb.ts (NEW):

- Centralized IndexedDB schema definition used by all future plans
- `openDB()` opens/creates/upgrades the `konsulin` database with all 7 stores
- `getStore(db, name, mode)` returns an `IDBObjectStore` for read/write
- Schema defined here once; plans 008–014 import and use without schema changes

@src/context/auth/authReducer.tsx:

- `localStorage.clear()` on logout — nukes ALL keys including non-auth data
- Replace: scoped IndexedDB deletion by userId/guestId (iterate 7 stores)

@src/services/api.tsx (401 interceptor):

- `localStorage.clear()` on expired/missing token — same problem
- Replace: scoped IndexedDB deletion

@src/app/page.tsx:

- `localStorage.getItem('redirect')` for post-login redirect
- Replace: read `redirect_intent` cookie instead

@src/constants/anonymous-session.ts:

- `ANONYMOUS_SESSION_GUEST_ID_STORAGE_KEY = 'konsulin.guest_id'`
- Replace: read from IndexedDB `guest_sessions` store or `guest_session` cookie

@docs/plans/006-offline-error-pages.md:

- Step "Add IndexedDB helper" creates the `openDB()` upgrade wrapper
- Schema definition moved here; 006's helper calls this schema on upgrade

@src/utils/intent-storage.ts:

- `saveIntent()`, `getIntent()` — localStorage-based intent system with 6-hour TTL
- Replace: redirect intent moves to `redirect_intent` cookie (see 004a)

# Risks

| Risk                                                           | Likelihood | Impact | Mitigation                                                                        |
| -------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------- |
| IndexedDB schema version conflict between plans                | Low        | High   | All 7 stores defined upfront in 004b; later plans only add entries, not stores    |
| Existing localStorage data lost on migration                   | Medium     | Medium | Read localStorage on first load, write to IndexedDB, then delete localStorage key |
| `localStorage.clear()` in auth reducer destroys IndexedDB data | Low        | High   | Change to scoped IndexedDB deletion; never call `clear()` on DB                   |

# UAT

1. No IndexedDB data -> visit app -> `guest_sessions` store created with guest_id entry
2. View IndexedDB in DevTools -> all 7 stores exist with correct keyPaths
3. Logout -> `localStorage.clear()` no longer called -> IndexedDB data for current user deleted only
4. 401 response -> same scoped deletion as logout
5. Existing data in localStorage survives migration read (first load copies to IndexedDB)
