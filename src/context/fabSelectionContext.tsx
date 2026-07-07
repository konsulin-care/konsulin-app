'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type FabSelectionState = {
  count: number;
  onDelete: () => void;
  onCancel: () => void;
} | null;

type FabSelectionContextType = {
  selectionState: FabSelectionState;
  setSelectionState: (state: FabSelectionState) => void;
};

const FabSelectionContext = createContext<FabSelectionContextType>({
  selectionState: null,
  setSelectionState: () => {
    /* noop — default outside provider */
  }
});

/** Wraps children with FabSelectionContext.Provider. */
export function FabSelectionProvider({
  children
}: {
  readonly children: React.ReactNode;
}) {
  const [selectionState, setSelectionState] =
    useState<FabSelectionState>(null);
  const value = useMemo(
    () => ({ selectionState, setSelectionState }),
    [selectionState]
  );
  return (
    <FabSelectionContext.Provider value={value}>
      {children}
    </FabSelectionContext.Provider>
  );
}

/** Returns the current FabSelectionContext value. */
export function useFabSelection() {
  return useContext(FabSelectionContext);
}
