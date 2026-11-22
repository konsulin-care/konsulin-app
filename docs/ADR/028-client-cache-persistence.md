---
title: Client Cache Persistence
description: Persist an allowlist of research queries to IndexedDB so counts and study structure survive reloads
status: accepted
date: 2026-11-13
---

# Context

Nothing fetched by the app survived a reload. TanStack Query held everything
in memory, so after a refresh the research hub was empty. HTTP caching cannot
help: the BFF sends `Cache-Control: no-store` on every proxied response and
the service worker fetches with `cache: 'no-store'`. Studies also load through
`POST /fhir` (a batch Bundle), which the service worker cannot cache.

The server-side count cache (API plan `PLAN-FHIR-COUNT-CACHE.md`, 30 minutes
in Redis) reduces load but does not help a reload or an offline device. The
client cache is the answer for both, at the cost of storing data on disk.

# Decision

Persist a small, explicit allowlist of TanStack Query v5 queries to IndexedDB
via `@tanstack/react-query-persist-client`, using a custom `Persister` over
the existing `src/lib/indexeddb` helpers.

**Allowlist (by query key, only `status === 'success'`)**

- `['study-participant-count', ...]`
- `['per-questionnaire-counts', ...]`
- `['questionnaire-titles', ...]`
- `['research', kind, id, mode]` where `key[0] === 'research'` and
  `key.length === 4`. The ongoing-studies key `['research']` is not persisted.

Mutations are never persisted (`shouldDehydrateMutation: () => false`).
`['assessments', id]` is never persisted: `useQuestionnaire` returns an axios
response, which is not plain data. No `QuestionnaireResponse` is ever stored.

**Storage semantics**

- Custom `Persister` uses structured clone (no JSON), so the `Map` inside
  `PerQuestionnaireCounts` survives.
- Writes are throttled with a trailing 1000 ms throttle.
- Persisting a client with zero queries and zero mutations deletes the record.
- `removeClient` cancels any pending throttled write.
- `maxAge` is 24 hours and the global `QueryClient` default `gcTime` is 24
  hours, which TanStack requires to be at least `maxAge`.
- A `CACHE_BUSTER` string constant is passed as `buster`. Bump it whenever a
  persisted query's shape changes, so old entries are discarded after a
  deploy.

**Freshness**

- Count queries use `staleTime` of 30 minutes, aligned with the backend cache
  TTL so the client and server agree on how stale a count may be.
- There is no optimistic count bump. Counts display exactly what the backend
  returns, so a user's own action does not fabricate a number.
- `BatchProgress` shows a tooltip disclaimer on the participant count: "This
  is a cached count, updated every 30 minutes to reduce server load."

**Privacy and clearing**

- Persisted data contains no answers, records, profile or appointments.
  Research progress persists only questionnaire ids and authored dates, which
  still reveals study participation; the ADR accepts that residual exposure.
- Logout and successful account removal call `clearQueryCache()`
  (`queryClient.clear()` plus `persister.removeClient()`). `clearUserData`
  also empties the `query_cache` store.
- On identity change (for example guest to patient login) only research
  progress queries `['research', kind, id, mode]` that do not match the
  current identity are removed. Shared count and title queries stay.
- Auth `login` dispatch is not hooked: it also fires on every cached-session
  reload and would needlessly wipe the cache.

# Impact

- Research counts, titles and study structure survive a reload and render
  offline for up to 24 hours.
- The `Map`-based counts work without a JSON transform, but any non-cloneable
  value in an allowlisted query breaks persistence; keep persisted queries
  plain.
- Counts can lag other devices by up to the 30-minute client TTL plus the
  30-minute server TTL. The tooltip states the count is cached.
- Each persisted query's shape is coupled to `CACHE_BUSTER`. Changing one
  without bumping it leaves stale shapes in IndexedDB.
- Research progress survives reloads for the current identity but is pruned on
  identity change and cleared on logout, limiting exposure on shared devices.
