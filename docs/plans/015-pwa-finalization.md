---
title: PWA Finalization
description: Full SW strategy, offline sync, cache invalidation
date: 2026-05-26
---

# Overview

Before implementing, read @docs/wiki/008-pwa-offline.md for current PWA and service worker setup.

Finalize the PWA layer: enhance the service worker with full caching
strategy, IndexedDB schema versioning and migration, offline sync queue
for assessment submissions, and cache invalidation for updated assets.

# Goals

- Service worker handles all navigation with network-first strategy
- Static assets cached with cache-first and versioned cache keys
- IndexedDB stores assessment drafts and pending submissions
- Offline sync queue replays failed submissions on reconnect
- Cache invalidation on SW update (new version detected)
- Install prompt (beforeinstallprompt event) handled gracefully

# Implementation Steps

- [ ] Enhance `web/static/js/sw.js` with full caching strategies
- [ ] Implement IndexedDB schema versioning: versioned stores with migration functions
- [ ] Add offline sync queue: store failed submissions, replay on `online` event
- [ ] Add cache invalidation: version cache stores; on activate, delete old caches
- [ ] Handle `beforeinstallprompt` for PWA install prompt
- [ ] Add SW update detection: `updatefound` event, notify user
- [ ] Write tests: cache strategy unit tests, IndexedDB migration tests

# Reference

@src/app/sw.ts:

- Serwist SW source: skipWaiting, clientsClaim, navigationPreload, defaultCache, offline fallback
- Replace: enhanced plain SW at web/static/js/sw.js
- Keep: same caching strategies, add IndexedDB sync queue

@next.config.mjs (Serwist plugin):

- withSerwist config: swSrc, swDest, reloadOnOnline
- Remove: entire plugin after plain SW verified

@src/app/~offline/page.tsx:

- Offline fallback page (M006 output)
- Reference: SW uses this page as fallback when navigation fails offline

# Risks

| Risk                                      | Likelihood | Impact | Mitigation                                                        |
| ----------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| IndexedDB migration fails                 | Low        | High   | Versioned stores with try-catch; fallback to clean schema         |
| SW cache serves stale assets after deploy | Medium     | Medium | Version cache names with build timestamp; SW update cycle         |
| Background sync not supported on iOS      | High       | Medium | Queue in IndexedDB; retry on next page load if sync not available |

# UAT

1. Load app — SW caches static assets (check Cache Storage in DevTools)
2. Deploy update — new SW detected, user notified to refresh
3. Submit assessment offline — stored in IndexedDB sync queue
4. Come back online — queue replays, submission succeeds
5. Install PWA — browser shows install prompt, app installs
