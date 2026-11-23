---
title: PWA & Offline Assessment
description: Service worker, IndexedDB, offline replay, owner scope
domain: frontend
action: replace
dependencies: [007-aehrc-forms.md]
---

# Summary

Current PWA uses Serwist (Next.js-specific, RSC/router prefetch); IndexedDB is portable.

# Current Implementation

`src/app/sw.ts` and `public/sw.js` (replace with plain SW), `src/app/~offline/page.tsx` (Go template), `src/app/manifest.json` (adapt).

# Business Rules

- Offline fallback page when navigator.onLine === false; cache-first static assets, network-first HTML navigation
- Questionnaire responses cached in IndexedDB for offline sync
- SW queue replays failed submissions; manifest sets name, icons, theme

# Query Cache Persistence

TanStack Query v5 persists an allowlist to IndexedDB via
`@tanstack/react-query-persist-client`, so research counts, titles and study
structure survive reloads and render offline for 24 hours. `maxAge` and
`gcTime` are 24h; `CACHE_BUSTER` busts stale shapes.

- **Allowlist** (key-based, `status === 'success'` only, no mutations):
  `['study-participant-count', ...]`, `['per-questionnaire-counts', ...]`,
  `['questionnaire-titles', ...]`, `['research', kind, id, mode]` (length 4).
  The bare `['research']` key, `['assessments', id]` (an axios response) and
  any QuestionnaireResponse or clinical data are never persisted.
- **Store**: a custom `Persister` over `src/lib/indexeddb` writes
  `query_cache` as structured clone (not JSON) so the `PerQuestionnaireCounts`
  `Map` survives; writes throttle 1000 ms, an empty client deletes the record.
- **Display**: counts show what the backend returns (no optimistic bump) with
  `staleTime` 30 minutes and the tooltip "This is a cached count, updated every
  30 minutes to reduce server load"; `withKAnonymityFloor` (5) applies and the
  line is hidden when there is no count, never 0.
- **Clearing and prefetch**: logout and account removal call
  `clearQueryCache()` (`queryClient.clear()` + `persister.removeClient()`);
  `clearUserData` empties `query_cache`; identity change prunes other
  identities' research queries but keeps shared count/title queries; full
  progress prefetches `['assessments', id]` per uncompleted `currentBatch`
  questionnaire so the SW caches the Questionnaire GET.

# Owner Scope

Pending submissions are scoped to the identity that created them.

- Authenticated: `Patient/<fhirId>` for Patient, else
  `Practitioner/<fhirId>` (Practitioner, Researcher, Clinic Admin).
- Guest: `guest:<identifier.value>` or `guest:unbound` (no author/identifier).
- SOAP bundle owner: first entry whose resource has `author.reference`.
- Owner is derived from the payload at replay, so legacy `ownerId: ''`
  items still route correctly.
- Unbound guest items replay only for a guest, bound with
  `buildAnonymousIdentifier(await ensureAnonymousSession(false))`.
  Authenticated users never send or see them.
- Replay waits until `useAuth().isLoading` is false.

# Replay Safety

- One IndexedDB module at `src/lib/indexeddb/index.ts`; test `vi.mock`
  calls keep working because the import path is unchanged.
- Locking: `navigator.locks.request('konsulin-replay',
{ ifAvailable: true }, cb)`. A null lock means another tab is running, so
  return without sending. Without locks, a module-level promise is shared.
- Exists probe (responses only): `GET
/fhir/QuestionnaireResponse?<scope>&questionnaire=<id>&authored=ge<x>&authored=le<x>&_summary=count`
  with `author=<ref>` or `identifier=<system>|<value>`. Bundle `total >= 1`
  drops the item; probe failure propagates and no POST is attempted.
- Error classes: network errors or 5xx keep and increment attempts;
  401/403 keep attempts; other 4xx park with `lastError`; 8 attempts
  parks with `max-attempts`.
- Parked items never auto-replay; `retrySubmission(id)` resets to
  waiting, attempts 0, and replays that item.

# Review UI & Logout

- Banner (app-chrome, every role) shows only the current owner's items:
  "N waiting to sync · Sync now" / "N could not be sent · Review" when > 0.
- Review dialog lists parked items with label, local date-time, mapped
  reason, collapsed raw error, Retry, and alert-confirmed Discard.
- Logout replays, asks keep/discard when the owner has items, then signs out
  and calls `clearUserData(userId, { queueOwnerKey })`; removal discards, expiry keeps.
- Queue write calls `navigator.storage?.persist?.()` on an empty queue.

# Go SSR Considerations

- Manifest.json static — serve from Go FileServer
- Service worker is plain JS — no build step needed
- IndexedDB interactions are browser-side — no server impact
- SW scope must match Go SSR routes (/ route prefix)
