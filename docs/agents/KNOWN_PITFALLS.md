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
- Large Bundle responses overwhelm mobile memory — always paginate with
  `_count` parameter and `Bundle.link[rel=next]`
- PractitionerRole contains nested availability by location — parse
  carefully for clinic-scoped vs practitioner-scoped scheduling
- Missing `_summary` parameter returns full resources — use `_summary=count`
  for list endpoints when only metadata needed
- Blaze FHIR silently ignores the `:contains` modifier on search parameters
  (e.g., `address-state:contains=Jak` returns ALL resources unfiltered).
  Use exact match only — no fuzzy/contains search on FHIR search params.

# Offline/PWA Pitfalls

- Service worker cache invalidation — version SW files with cache busting
- IndexedDB schema versioning — use versioned stores and migration
- stale-while-revalidate strategy may show old data — use NetworkFirst
  for navigation requests
- AEHRC renderer loads terminology server URL — must be configurable
  in the React SPA env, not Go env

# AEHRC Embedding Pitfalls

- React SPA loaded on every assessment route visit — bundle cached by SW
- Cross-origin requests from React SPA to Go proxy require same-origin
  or CORS headers
- AEHRC builds form via `useBuildForm()` — ensure Questionnaire JSON
  is fully loaded before mounting the component
- Admin JS files from aehrc renderer may conflict with HTMX headers

# Tailwind v4 CSS Pitfalls

- `data-[*]:` variants for custom `@layer utilities` classes do NOT
  generate working CSS in Tailwind v4. The variant modifier is silently
  ignored at build time.
- **Fix**: define an explicit class with `!important` that targets the
  state attribute directly, e.g.
  `.foo[data-state='active'] { color: var(--secondary) !important; }`
  and apply it via `className`.
- This applies to ALL state-driven styling: `data-state`, `aria-*`,
  or any `[data-*]` attribute — tabs, drawers, modals, accordions.
  Never use `data-[*]:bg-<custom>` for a `@layer utilities` class.

# TypeScript/React Pitfalls

- **Void-returning arrow shorthands in JSX** — `onClick={e => handler(e)}`
  implicitly returns `undefined` when the handler returns `void`. Always
  use braces: `onClick={e => { handler(e); }}`.
- **Redundant null checks on initialized state** — `useState<T>([])`
  guarantees the value is always an array. A guard like
  `if (!items || items.length === 0)` has a dead `!items` branch.
  Trust your initializer: `if (items.length === 0)`.
- **Local variable `children` shadows React concept** — rename to
  `childElements`, `items`, or `slots` to avoid confusion with React's
  `children` prop.
- **Dynamic property access without prototype guard** — writing
  `obj[key] = val` where `key` could be `__proto__` or `constructor`
  risks prototype pollution. Use `Map<K, V>` for dynamic-key maps, or
  guard writes with `Object.hasOwn(obj, key)` before assignment.
- **Stale-closure safety nets vs. redundant checks** — in `useEffect`
  cleanup/observer callbacks, re-checking a condition already guarded
  at effect scope is redundant. Remove the redundant check or accept
  the lint warning explicitly with a comment.
