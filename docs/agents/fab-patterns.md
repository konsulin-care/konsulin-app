---
title: FAB Transformation Patterns
description: Floating Action Button — modes, action/selection state wiring, cleanup rules
status: updated
date: 2026-07-20
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
(see `use-booking-form.ts`) to avoid stale closures:

```tsx
const ref = useRef(handleSubmit);
ref.current = handleSubmit;
useEffect(() => {
  if (isFormValid) {
    dispatch({
      type: 'SET_ACTION',
      config: { label: 'Book Now', onAction: () => ref.current() }
    });
  } else {
    dispatch({ type: 'SET_ACTION', config: null });
  }
  return () => dispatch({ type: 'SET_ACTION', config: null });
}, [isFormValid, dispatch]);
```

# Examples in Codebase

| Page                      | Label          | Action              | File                        |
| ------------------------- | -------------- | ------------------- | --------------------------- |
| Practitioner Availability | "Book Now"     | Submit booking form | `use-fab-action-sync.ts`    |
| Role Management Shell     | "Save Changes" | Save permissions    | `role-management-shell.tsx` |
| Record Detail (own note)  | "Edit"         | Open editor         | `record-detail.tsx`         |
| Record Detail (paid QR)   | "Get Report"   | Open payment drawer | `record-detail.tsx`         |

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
