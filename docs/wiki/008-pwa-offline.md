---
title: PWA & Offline Assessment
description: Service worker, IndexedDB, offline replay, owner scope
domain: frontend
action: replace
dependencies: [007-aehrc-forms.md]
---

# Summary

Current PWA uses Serwist (Next.js-specific library). Must be replaced
with a plain service worker since Serwist is tightly coupled to Next.js
patterns (RSC, router prefetch). IndexedDB usage for assessment storage
is portable.

# Current Implementation

| File                        | Purpose                       | Fate                     |
| --------------------------- | ----------------------------- | ------------------------ |
| `src/app/sw.ts`             | Serwist service worker config | Replace with plain SW    |
| `public/sw.js`              | Built service worker          | Replace                  |
| `src/app/~offline/page.tsx` | Offline fallback page         | Replace with Go template |
| `src/app/manifest.json`     | PWA manifest                  | Keep (adapt)             |

# Business Rules

- Offline fallback page shown when navigator.onLine === false
- Cache-first strategy for static assets
- Network-first for HTML navigation
- Questionnaire responses cached in IndexedDB for offline sync
- Service worker queue replays failed submissions
- PWA manifest defines app name, icons, theme color

# Owner Scope

Pending submissions are scoped to the identity that created them.

- Authenticated: `Patient/<fhirId>` when role is Patient, otherwise
  `Practitioner/<fhirId>` (Practitioner, Researcher, Clinic Admin).
- Guest: `guest:<identifier.value>` for the anonymous session identifier
  system; payloads with no author and no identifier become `guest:unbound`.
- SOAP bundle: owner is the first entry whose resource has
  `author.reference`.
- Owner is derived from the payload at replay time, so legacy items with
  `ownerId: ''` still route correctly.
- Unbound guest items replay only for a guest; the handler binds them with
  `buildAnonymousIdentifier(await ensureAnonymousSession(false))` before
  sending. Authenticated users never send or see them.
- Replay waits until `useAuth().isLoading` is false.

# Replay Safety

- A single IndexedDB module lives in `src/lib/indexeddb/index.ts`; the
  former monolith and legacy files are removed. Test `vi.mock` calls keep
  working because the import path is unchanged.
- Locking: `navigator.locks.request('konsulin-replay',
{ ifAvailable: true }, cb)`. A null lock means another tab is running,
  so return without sending. Without `navigator.locks`, a module-level
  in-flight promise is shared by concurrent callers.
- Exists probe (questionnaire responses only): `GET
/fhir/QuestionnaireResponse?<scope>&questionnaire=<id>&authored=ge<x>&authored=le<x>&_summary=count`
  with scope `author=<ref>` or `identifier=<system>|<value>`. When the
  returned Bundle has `total >= 1`, resolve without POST and drop the
  item. Probe failure propagates; no POST is attempted.
- Error classes: network errors (no status) or 5xx keep the item and
  increment attempts; 401/403 keep it with attempts unchanged; other 4xx
  park it with `lastError`; 8 attempts parks it with `max-attempts`.
- Parked items are never auto-replayed. `retrySubmission(id)` resets to
  waiting, attempts 0, and replays that item.

# Review UI & Logout

- Banner (app-chrome, every role) shows only the current owner's items:
  "N waiting to sync · Sync now" and "N could not be sent · Review",
  each only when > 0.
- Review dialog lists parked items with label, local date-time, mapped
  reason (400/422 invalid, 404 questionnaire gone, max-attempts several
  tries, else generic), raw error in collapsed details, Retry, and
  Discard confirmed by alert-dialog.
- Logout replays first, then asks keep or discard when the current owner
  still has queue items, then signs out and calls
  `clearUserData(userId, { queueOwnerKey })` (option only on discard).
  Account removal always discards. Token expiry keeps the queue.
- Queue write calls `navigator.storage?.persist?.()` when queued into an
  empty queue.

# Go SSR Considerations

- Manifest.json static — serve from Go FileServer
- Service worker is plain JS — no build step needed
- IndexedDB interactions are browser-side — no server impact
- SW scope must match Go SSR routes (/ route prefix)
