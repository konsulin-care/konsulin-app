'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type FabDirtyState = {
  isDirty: boolean;
  label: string;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
};

type FabDirtyContextType = {
  dirtyState: FabDirtyState | null;
  setDirtyState: (state: FabDirtyState | null) => void;
};

const FabDirtyContext = createContext<FabDirtyContextType>({
  dirtyState: null,
  setDirtyState: () => {
    /* noop — default outside provider */
  }
});

/** Wraps children with FabDirtyContext.Provider. */
export function FabDirtyProvider({ children }: { children: React.ReactNode }) {
  const [dirtyState, setDirtyState] = useState<FabDirtyState | null>(null);
  const value = useMemo(() => ({ dirtyState, setDirtyState }), [dirtyState]);
  return (
    <FabDirtyContext.Provider value={value}>
      {children}
    </FabDirtyContext.Provider>
  );
}

/** Returns the current FabDirtyContext value. */
export function useFabDirty() {
  return useContext(FabDirtyContext);
}
