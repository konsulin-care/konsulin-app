---
title: FAB Transformation Patterns
description: Floating Action Button — three modes, dirty/selection state wiring, cleanup rules
status: updated
date: 2026-07-20
---

# Architecture

The FAB (QuickActionFab) is hierarchically wrapped by two providers:

```
FabDirtyProvider ── FabSelectionProvider ── QuickActionFab
                      Page Content
```

Priority: **Selection (delete) > Dirty (save) > Speed-dial (navigation)**.
Selection mode suppresses all other modes.

# Three Modes

| Mode       | Trigger             | UI                    |
| ---------- | ------------------- | --------------------- |
| Selection  | `useFabSelection()` | Red pill "Delete (N)" |
| Dirty      | `useFabDirty()`     | Labeled teal button   |
| Speed-dial | Default (no state)  | `+` icon → role pills |

# Wiring Dirty State

Import and call `setDirtyState()`:

```tsx
import { useFabDirty } from '@/context/fabDirtyContext';

function MyPage() {
  const { setDirtyState } = useFabDirty();

  useEffect(() => {
    setDirtyState({
      isDirty: true,
      label: 'Book Now',
      onSave: () => handleSubmit(),
      isSaving: false
    });
    return () => setDirtyState(null); // REQUIRED cleanup
  }, [setDirtyState]);
}
```

The `return () => setDirtyState(null)` cleanup is required. Without it, the
FAB stays in dirty mode after the page unmounts.

# Ref Pattern for onSave Closures

The `onSave` callback is captured when `setDirtyState` is called. To keep it
fresh (avoid stale closures), store the handler in a ref (see
`use-booking-form.ts`):

```tsx
const ref = useRef(handleSubmit);
ref.current = handleSubmit;
useEffect(() => {
  if (isFormValid) {
    setDirtyState({
      isDirty: true,
      label: 'Book Now',
      onSave: () => ref.current(),
      isSaving: false
    });
  } else {
    setDirtyState(null);
  }
  return () => setDirtyState(null);
}, [isFormValid, setDirtyState]);
```

# Examples in Codebase

| Page                      | Label          | Action                 | File                            |
| ------------------------- | -------------- | ---------------------- | ------------------------------- |
| Practitioner Availability | "Book Now"     | Submit booking form    | `practitioner-availability.tsx` |
| Role Management Shell     | "Save Changes" | Save permissions       | `role-management-shell.tsx`     |
| Record Assessment (auth)  | "Share Result" | Open QR drawer         | `record-assessment.tsx`         |
| Record Assessment (guest) | "Save Result"  | Save intent + redirect | `record-assessment.tsx`         |

# Wiring Selection State

```tsx
import { useFabSelection } from '@/context/fabSelectionContext';

function ServicesTab() {
  const { setSelectionState } = useFabSelection();
  useEffect(() => {
    setSelectionState({
      count: selectedIds.length,
      onDelete: handleBulkDelete,
      onCancel: clearSelection
    });
    return () => setSelectionState(null);
  }, [selectedIds, setSelectionState]);
}
```

Selection mode takes highest priority — overrides both dirty and speed-dial.
