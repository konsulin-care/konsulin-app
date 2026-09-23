'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface ResearchFormActions {
  /** Whether the current page can advance (validation passes). */
  canAdvance: boolean;
  /** Advance to the next page. */
  onAdvance: () => void;
  /** Submit the form. */
  onSubmit: () => void;
}

const ResearchFormActionsContext = createContext<ResearchFormActions | null>(
  null
);

/**
 * Provides research form actions (advance/submit) to the FAB.
 * Must be used inside the research form pages.
 */
export function ResearchFormActionsProvider({
  children,
  value
}: Readonly<{
  children: ReactNode;
  value: ResearchFormActions;
}>) {
  return (
    <ResearchFormActionsContext.Provider value={value}>
      {children}
    </ResearchFormActionsContext.Provider>
  );
}

/**
 * Returns the research form actions for the current page.
 * Throws if used outside a ResearchFormActionsProvider.
 */
export function useResearchFormActions(): ResearchFormActions {
  const ctx = useContext(ResearchFormActionsContext);
  if (!ctx) {
    throw new Error(
      'useResearchFormActions must be used within a ResearchFormActionsProvider'
    );
  }
  return ctx;
}
