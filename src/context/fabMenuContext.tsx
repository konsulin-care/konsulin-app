'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode
} from 'react';

export type FabMenuAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onAction: () => void | Promise<void>;
};

export type FabMenuState = {
  icon: ComponentType<{ className?: string }>;
  actions: FabMenuAction[];
} | null;

type FabMenuContextType = {
  menuState: FabMenuState;
  setMenuState: (state: FabMenuState) => void;
};

const FabMenuContext = createContext<FabMenuContextType>({
  menuState: null,
  setMenuState: () => {
    /* noop — default outside provider */
  }
});

/** Wraps children with FabMenuContext.Provider. */
export function FabMenuProvider({
  children
}: {
  readonly children: ReactNode;
}) {
  const [menuState, setMenuState] = useState<FabMenuState>(null);
  const value = useMemo(() => ({ menuState, setMenuState }), [menuState]);
  return (
    <FabMenuContext.Provider value={value}>{children}</FabMenuContext.Provider>
  );
}

/** Returns the current FabMenuContext value. */
export function useFabMenu() {
  return useContext(FabMenuContext);
}
