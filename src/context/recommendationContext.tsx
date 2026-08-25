'use client';

import type { InterviewResult } from '@/types/recommendation-interview';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

/** Shape exposed by the recommendation context. */
interface RecommendationContextValue {
  /** Latest completed screening result, or null before any screening. */
  result: InterviewResult | null;
  /** Replaces the latest result (e.g. on screening completion). */
  setResult: (result: InterviewResult | null) => void;
}

const RecommendationContext = createContext<
  RecommendationContextValue | undefined
>(undefined); // skipcq: JS-W1042 — required by React createContext<T|undefined>(undefined)

/**
 * Holds the latest screening result so the FAB writer and the home /
 * recommendation read surfaces share one source of truth.
 *
 * Pages hydrate this from IndexedDB on mount; the FAB updates it on
 * screening completion.
 *
 * @param children - Descendant components that need the recommendation result
 */
export function RecommendationProvider({
  children
}: Readonly<{ children: ReactNode }>) {
  const [result, setResult] = useState<InterviewResult | null>(null);
  const value = useMemo<RecommendationContextValue>(
    () => ({ result, setResult }),
    [result]
  );
  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}

/**
 * Read the latest recommendation result and its setter.
 *
 * @returns The result value and a setter
 * @throws When used outside a `RecommendationProvider`
 */
export function useRecommendationResult(): RecommendationContextValue {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error(
      'useRecommendationResult must be used within RecommendationProvider'
    );
  }
  return context;
}
