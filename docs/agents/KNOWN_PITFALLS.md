---
title: Known Pitfalls
description: Common mistakes to avoid in the Go SSR rewrite
date: 2026-05-26
---

# Go SSR Pitfalls

- Session state lost on HTMX partial renders — use cookie-based sessions
- Form state across HTMX requests requires hidden inputs or hx-vals
- Templ re-renders entire component on change — break large pages into
  small components scoped by hx-target
- `os.Getenv()` returns empty string for missing vars — validate at startup
- Chi middleware order matters — logging before auth, recover after all
- Serving frontend assets while proxy-ing API on same port confuses routes

# FHIR Pitfalls

- N+1 FHIR queries trigger 429 — scope by identity + server-side
  `questionnaire=` filter in one query, never one request per questionnaire
- N+1 queries when resolving referenced resources — batch in a single
  bundle or use `_include` parameter
- Large Bundle responses overwhelm mobile memory — paginate with `_count`
  and follow `Bundle.link[rel=next]`
- PractitionerRole contains nested availability by location — parse
  carefully for clinic-scoped vs practitioner-scoped scheduling
- Missing `_summary` returns full resources — use `_summary=count` for
  list endpoints when only metadata is needed
- Blaze FHIR silently ignores the `:contains` modifier on search params
  (e.g. `address-state:contains=Jak` returns ALL resources). Use exact
  match only — no fuzzy search on FHIR search params.

# Offline/PWA Pitfalls

- Service worker cache invalidation — version SW files with cache busting
- IndexedDB schema versioning — use versioned stores and migration
- stale-while-revalidate may show old data — use NetworkFirst for
  navigation requests
- AEHRC renderer loads terminology server URL — must be configurable
  in the React SPA env, not Go env

# AEHRC Embedding Pitfalls

- React SPA loaded on every assessment route visit — bundle cached by SW
- Cross-origin requests from React SPA to Go proxy require same-origin
  or CORS headers
- AEHRC builds the form via `useBuildForm()` — ensure Questionnaire JSON
  is fully loaded before mounting
- Admin JS files from the aehrc renderer may conflict with HTMX headers

# Tailwind v4 CSS Pitfalls

- `data-[*]:` variants work with theme utilities and custom utilities
  declared via `@utility` (e.g. `@utility foo { ... }`).
- Plain classes inside `@layer utilities { ... }` are not registered
  utilities, so `data-[state=open]:foo-custom` silently emits nothing.
  **Fix**: declare custom utilities with `@utility`.
- Applies to ALL state-driven styling: `data-state`, `aria-*`, or any
  `[data-*]` attribute — tabs, drawers, modals, accordions.

# TypeScript/React Pitfalls

- **Vitest `vi.mock` cannot be extracted to shared utilities** — Vitest
  hoists `vi.mock()` calls to module top level. A shared utility runs its
  mocks in that module, not the caller, causing conflicts. **Fix**: keep
  `vi.mock` calls inline at the top of each test file; only extract
  non-mock helpers (`renderWithQuery`, `wrapper`, constants).
- **Void-returning arrow shorthands in JSX** — `onClick={e => handler(e)}`
  implicitly returns `undefined`. Always use braces:
  `onClick={e => { handler(e); }}`.
- **Redundant null checks on initialized state** — `useState<T>([])`
  guarantees an array. A guard like `if (!items || items.length === 0)`
  has a dead `!items` branch. Trust the initializer.
- **Local variable `children` shadows React concept** — rename to
  `childElements`, `items`, or `slots`.
- **Dynamic property access without prototype guard** — writing
  `obj[key] = val` where `key` could be `__proto__` or `constructor`
  risks prototype pollution. Use `Map<K, V>`, or guard writes with
  `Object.hasOwn(obj, key)`.
- **Never use an inline `?? []` / `?? {}` fallback as a hook dependency** —
  `progress?.consentedStudyIds ?? []` allocates a new array every render, so
  every hook built on it (`useConsent`'s Set and `isConsented`, then the
  action callback) changes identity each render. The dependent effect re-runs,
  dispatches `SET_ACTION` and `fabReducer` always returns a new state object,
  which re-renders and repeats. This caused an infinite FAB dispatch loop that
  starved every router navigation on `/research`. **Fix**: derive the fallback
  once (`useMemo`, a module constant, or a stable empty array) before it
  reaches a dependency array.
- **Stale-closure safety nets vs. redundant checks** — in `useEffect`
  cleanup/observer callbacks, re-checking a condition already guarded at
  effect scope is redundant. Remove it or accept the lint warning.

# Date & Time Zone Pitfalls

- **vitest.config.ts forces `TZ=UTC`** — tests that compare local dates
  silently assume UTC and miss time-zone drift. Pass
  `timeZone: 'Asia/Jakarta'` explicitly to `localDateOf`, or set
  `process.env.TZ = 'Asia/Jakarta'` inside the test and restore it after.
- **Never use `toISOString().slice(0, 10)` for local dates** — it yields
  the UTC day, which can be one day off in WIB/WITA/WIT. Use date-fns
  `format(date, 'yyyy-MM-dd')` for date pickers and "today".

# Test Duplication Pitfalls

- **Codacy flags `vi.mock` blocks as duplication** — expected; see above.
- **What CAN be extracted** — factories, constants, and render helpers in
  `src/__tests__/fixtures/` (e.g. `makeResearchStudy()`, `wrapper()`).
- **What CANNOT be extracted** — `vi.mock()` factories and assertions.
- **Priority** — extract data factories first, then `beforeEach` patterns.
