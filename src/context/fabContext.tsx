'use client';

import type {
  ActionConfig,
  MenuConfig,
  ResolvedMode,
  SelectionConfig
} from '@/components/fab/types';
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode
} from 'react';

export interface FabState {
  action: ActionConfig | null;
  selection: SelectionConfig | null;
  menu: MenuConfig | null;
  panelOpen: boolean;
}

export type FabAction =
  | { type: 'SET_ACTION'; config: ActionConfig | null }
  | { type: 'SET_SELECTION'; config: SelectionConfig | null }
  | { type: 'SET_MENU'; config: MenuConfig | null }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'CLOSE_PANEL' }
  | { type: 'CLEAR_ALL' };

/**
 * Reducer for FAB state transitions.
 * Setting any mode closes the panel automatically.
 */
export function fabReducer(state: FabState, action: FabAction): FabState {
  switch (action.type) {
    case 'SET_ACTION': {
      return { ...state, action: action.config, panelOpen: false };
    }
    case 'SET_SELECTION': {
      return { ...state, selection: action.config, panelOpen: false };
    }
    case 'SET_MENU': {
      return { ...state, menu: action.config, panelOpen: false };
    }
    case 'TOGGLE_PANEL': {
      return { ...state, panelOpen: !state.panelOpen };
    }
    case 'CLOSE_PANEL': {
      return { ...state, panelOpen: false };
    }
    case 'CLEAR_ALL': {
      return { action: null, selection: null, menu: null, panelOpen: false };
    }
    default: {
      return state;
    }
  }
}

const INITIAL_STATE: FabState = {
  action: null,
  selection: null,
  menu: null,
  panelOpen: false
};

const NOOP_DISPATCH: React.Dispatch<FabAction> = () => {
  /* noop — default outside provider */
};

/**
 * Resolve the active mode based on priority:
 * selection > action > menu > idle.
 */
export function resolveMode(state: FabState): ResolvedMode {
  if (state.selection) return { type: 'selection', config: state.selection };
  if (state.action) return { type: 'action', config: state.action };
  if (state.menu) return { type: 'menu', config: state.menu };
  return { type: 'idle' };
}

interface FabContextType {
  state: FabState;
  dispatch: React.Dispatch<FabAction>;
}

const FabContext = createContext<FabContextType>({
  state: INITIAL_STATE,
  dispatch: NOOP_DISPATCH
});

/** Wraps children with FabContext.Provider. */
export function FabProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(fabReducer, INITIAL_STATE);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

/** Returns the current FabContext value. */
export function useFab(): FabContextType {
  return useContext(FabContext);
}
