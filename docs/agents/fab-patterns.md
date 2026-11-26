---
title: FAB Transformation Patterns
description: Floating Action Button — modes, action/selection state wiring, cleanup rules
status: updated
date: 2026-11-24
---

# Architecture

`QuickActionFab` reads one reducer context — `FabProvider` in
`@/context/fabContext`, accessed via `useFab()`. Page content dispatches
`FabAction` values (`SET_ACTION` / `SET_SELECTION` / `SET_MENU`).

Priority (`resolveMode`): **Selection (delete) > Action (save) > Menu >
idle (speed-dial)**. Selection mode suppresses all other modes.

# Three Modes

| Mode       | Dispatch                 | UI                                       |
| ---------- | ------------------------ | ---------------------------------------- |
| Selection  | `SET_SELECTION`          | Red pill "Delete (N)"                    |
| Action     | `SET_ACTION`             | Labeled turquoise button, charcoal label |
| Speed-dial | none (idle) / `SET_MENU` | `+` icon → role pills                    |

The speed-dial toggle label comes from `page-header.open_menu` /
`page-header.close_menu`. From 768px the action, selection and menu modes render
in the rail/sidebar instead (see ADR 031), except the page primary action, which
renders in `ContentActionBar` inside `<main>` from md (see ADR 032).

# Pages Without an Action

The participant home (`/research`, also the patient and guest root `/`) and
the study page (`/study?id=X`) dispatch no `SET_ACTION`. Their primary action
is a button inside the card, so the FAB stays idle there.

The all-studies page (`/studies`) also dispatches nothing. Only the researcher
home keeps a page action ("Register Survey", icon FlaskConical) and the
research form pages dispatch Next/Submit through `use-fab-action.ts`.

# Wiring Action State

```tsx
import { useFab } from '@/context/fabContext';

function MyPage() {
  const { dispatch } = useFab();
  useEffect(() => {
    dispatch({
      type: 'SET_ACTION',
      config: { label: 'Book Now', onAction: () => handleSubmit() }
    });
    return () => dispatch({ type: 'SET_ACTION', config: null }); // REQUIRED
  }, [dispatch]);
}
```

The `config: null` cleanup is required — without it the FAB stays in action
mode after the page unmounts.

# Icon-only FAB with a Bar Label

Omit `label` to render the phone FAB as an icon-only circle and pass the
visible text as `barLabel`. `ContentActionBar` renders `barLabel ?? label`, so
wide viewports still show a named action:

```tsx
config: { barLabel: t('next_step'), icon: ChevronRight, onAction }
```

The research form advance action uses this (`use-fab-action.ts`).

# Ref Pattern for onAction Closures

`onAction` is captured when `SET_ACTION` fires. Store the handler in a ref
(see `use-booking-form.ts`) and call `ref.current()` inside `onAction` to
avoid stale closures. Re-dispatch `config: null` when the action is no
longer valid, and always return the cleanup.

# Wiring Selection State

```tsx
const { dispatch } = useFab();
useEffect(() => {
  dispatch({
    type: 'SET_SELECTION',
    config: {
      count: selectedIds.length,
      onDelete: handleBulkDelete,
      onCancel: clearSelection
    }
  });
  return () => dispatch({ type: 'SET_SELECTION', config: null });
}, [selectedIds, dispatch]);
```

Selection mode takes highest priority — overrides both action and speed-dial.

# Report Page FAB

Four `/report` states in priority order: see `@docs/agents/report-fab-states.md`.
