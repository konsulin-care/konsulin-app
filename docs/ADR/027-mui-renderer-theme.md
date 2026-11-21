---
title: MUI Renderer Theme
description: Own MUI theme built from renderer exports and our tokens, with a single MUI copy
status: accepted
date: 2026-11-13
---

# Context

The `@aehrc/smart-forms-renderer` ships a default MUI theme: blue primary,
green secondary. That palette contradicts our charcoal, paper and turquoise
design language, so the assessment and SOAP forms looked foreign next to the
rest of the app.

The renderer docs (https://smartforms.csiro.au/docs/dev/renderer-utilities)
state the supported route: do not fight the defaults, replace them with your
own MUI `ThemeProvider`. `RendererConfig` only controls layout; it has no
colour surface, so theming through config is not an option.

MUI is also a moving dependency. The renderer pins its own `@mui/material`
version. If we declare `@mui/material` in `package.json`, npm can install a
different version at the top level than the one the renderer resolves, and
the two copies split the React context. A theme applied through our copy then
never reaches the renderer's components, and the default palette silently
returns.

# Decision

- Build our own theme from the renderer's exported `rendererThemeOptions` and
  `rendererThemeComponentOverrides`, merged with our `TOKENS` from
  `@src/styles/tokens.ts`. The result is passed to a MUI `ThemeProvider` that
  replaces `RendererThemeProvider`.
- The same themed provider wraps both the assessments and the SOAP form so
  every renderer surface shares one palette.
- Keep `StyledEngineProvider injectFirst` so MUI's generated styles lose to
  Tailwind utilities, as before.
- `@mui/material` stays undeclared in `package.json`. It is imported
  transitively and resolves to the copy `@aehrc/smart-forms-renderer` brings.
  This is deliberate: declaring it risks a second copy after independent
  upgrades, which silently disables the theme.
- `src/__tests__/mui-single-copy.test.ts` guards the invariant by asserting
  exactly one MUI copy resolves and that `package.json` does not declare it.

# Impact

- Forms inherit the charcoal, paper and turquoise palette, so renderer screens
  match the rest of the app with no per-component override.
- Renderer upgrades can change the MUI version it brings. Every upgrade must
  re-run `mui-single-copy.test.ts`; a red test means a second copy appeared and
  the theme is dead until it is resolved.
- We own the theme merge. New renderer component overrides must be folded into
  our theme explicitly rather than relying on renderer defaults.
- No colour work is needed in `RendererConfig`; it stays layout-only.
