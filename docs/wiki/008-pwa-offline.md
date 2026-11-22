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

TanStack Query v5 persists a small allowlist to IndexedDB via
`@tanstack/react-query-persist-client` so research counts, titles and
study structure survive reloads and render offline for 24 hours.

- **Allowlist**: `['study-participant-count', ...]`,
  `['per-questionnaire-counts', ...]`, `['questionnaire-titles', ...]`,
  and `['research', kind, id, mode]` (key[0] === 'research' AND
  key.length === 4). The bare `['research']` key is NOT persisted. Only
  `status === 'success'` queries; `shouldDehydrateMutation: () => false`.
- **Never persisted**: `['assessments', id]` (an axios response) or any
  QuestionnaireResponse / clinical data.
- **Policy**: `gcTime` 24h (>= `maxAge`), `maxAge` 24h, `CACHE_BUSTER`
  as buster; keep `refetchOnWindowFocus: false` and `retry: 0`.
- **Store**: a custom `Persister` over `src/lib/indexeddb`
  (`dbGet`/`dbSet`/`dbDelete`) writes `query_cache` with structured
  clone (not JSON), so the `Map` in `PerQuestionnaireCounts` survives.
  Writes are trailing-throttled 1000 ms; an empty client deletes the
  record; `removeClient` cancels any pending write.
- **Display**: no optimistic bump; count queries use `staleTime` 30
  minutes. BatchProgress tooltips the count: "This is a cached count,
  updated every 30 minutes to reduce server load." Apply
  `withKAnonymityFloor` (`COMPLETION_COUNT_FLOOR = 5`) and hide the
  "Total participants" line when there is no count (absent, below floor,
  or empty map). Never render "Total participants: 0".
- **Clearing**: logout and account removal call `clearQueryCache()`
  (`queryClient.clear()` + `persister.removeClient()`); `clearUserData`
  also empties `query_cache`. On identity change remove only
  `['research', kind, id, mode]` queries that do not match the current
  identity; shared count/title queries stay. Do NOT hook auth `login`
  (it fires on cached-session reload).
- **Prefetch**: after full progress loads while `navigator.onLine`,
  prefetch `['assessments', id]` for each uncompleted questionnaire of
  each study's `currentBatch`, reusing the exact `useQuestionnaire`
  queryFn/URL so the SW caches the Questionnaire GET (network-first
  `/proxy/fhir/Questionnaire*`).

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
