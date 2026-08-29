---
title: PWA & Offline Assessment
description: Service worker, IndexedDB, offline fallback
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

# Go SSR Considerations

- Manifest.json static — serve from Go FileServer
- Service worker is plain JS — no build step needed
- IndexedDB interactions are browser-side — no server impact
- SW scope must match Go SSR routes (/ route prefix)
