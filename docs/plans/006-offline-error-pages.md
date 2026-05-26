---
title: Offline & Error Pages
description: Offline fallback, 404 page, plain service worker
date: 2026-05-26
---

# Overview

Implement offline fallback page (`/~offline`), custom 404 page, and a
plain service worker to replace Serwist (Next.js-specific PWA plugin).
The service worker uses cache-first for static assets and network-first
for navigation, enabling offline assessment access.

# Goals

- `GET /~offline` renders static offline fallback page from Go SSR
- `GET /404` renders custom not-found page
- Service worker (`web/static/js/sw.js`) replaces Serwist entirely
- Cache-first strategy for `/static/*` assets
- Network-first strategy for navigation requests
- Offline fallback page displayed when navigation fails offline
- Next.js Serwist code removed from `next.config.mjs` and deps

# Implementation Steps

- [ ] Create `web/template/pages/offline.templ` — offline fallback with app logo, message, retry button
- [ ] Create `web/template/pages/notfound.templ` — 404 page with link to home
- [ ] Register `GET /~offline` and `GET /404` in Chi router
- [ ] Create `web/static/js/sw.js` — plain service worker with install/activate/fetch listeners
- [ ] Implement cache-first for `/static/*`: on install pre-cache critical assets, on fetch serve from cache, update in background
- [ ] Implement network-first for navigation: try network, fall back to cache, last resort to `/~offline`
- [ ] Add IndexedDB helper (for later assessment offline storage): versioned open, schema creation
- [ ] Register SW in `base.templ` via `<script>` tag (remove Next.js Serwist registration)
- [ ] Remove Serwist from `next.config.mjs` and `package.json`
- [ ] Remove `public/sw.js` (Serwist-generated) — replaced by `web/static/js/sw.js`
- [ ] Write `web/static/js/sw.test.js` (vitest) — test SW logic (cache strategies, offline detection)
- [ ] Verify: SW installs, caches assets, serves offline page when offline

# Reference

@src/app/~offline/page.tsx:

- Offline fallback: "Loading-Time.svg" illustration, "You're Offline" heading, Retry button
- Reimplement: same content as static Go SSR page at GET /~offline

@src/app/not-found.tsx:

- 404 page: "Fast-Internet.svg" illustration, "Page Not Found" heading, Go Home button
- Reimplement: same content as Go SSR page at GET /404

@src/app/sw.ts:

- Serwist SW source: skipWaiting, clientsClaim, navigationPreload, defaultCache, offline fallback
- Replace: plain SW at web/static/js/sw.js with same caching strategies

@next.config.mjs (Serwist plugin):

- withSerwist config: swSrc, swDest, reloadOnOnline
- Remove: entire Serwist plugin config once plain SW is verified

@public/sw.js:

- Compiled Serwist SW (auto-generated)
- Remove: replaced by manual web/static/js/sw.js

# Risks

| Risk                                         | Likelihood | Impact | Mitigation                                                                     |
| -------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| Serwist removal breaks existing PWA behavior | Medium     | High   | Test offline behavior before and after; keep Serwist code until SW is verified |
| SW cache invalidation fails                  | Medium     | Medium | Version SW files with cache-busting query param or SW update cycle             |
| Browser caches old SW                        | Low        | Low    | Use `skipWaiting()` and `clients.claim()` in activate event                    |

# UAT

1. Visit app online — SW installs (check Application > Service Workers in DevTools)
2. Go offline (DevTools Network tab) — navigate to cached page, works
3. Navigate to a new URL while offline — see offline fallback page
4. Come back online — navigation requests resume normally
5. Visit a non-existent URL — see 404 page
