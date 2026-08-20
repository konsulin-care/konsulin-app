'use client';

import { useRecommendationResult } from '@/context/recommendationContext';
import type { InterviewResult } from '@/types/recommendation-interview';
import { readLastInterviewResult } from '@/utils/recommendation-interview';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared patient/guest home hook: reads the latest screening result from the
 * recommendation context (written by the FAB) and hydrates it from IndexedDB
 * once on mount for direct-visit loads.
 *
 * Homepage renders the recommendation stack inline, so completing the
 * screening here updates `savedResult` in place instead of navigating.
 *
 * @returns savedResult, drawer state, and lifecycle callbacks
 */
export function useSavedRecommendation() {
  const { result, setResult } = useRecommendationResult();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hydrate from IndexedDB once on mount — only when no result exists yet so
  // a FAB-set value is never overwritten by a stale async read.
  const latestResultRef = useRef(result);
  latestResultRef.current = result;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await readLastInterviewResult();
        if (active && !latestResultRef.current && stored) setResult(stored);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [setResult]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const queryClient = useQueryClient();

  const handleComplete = useCallback(
    (completedResult: InterviewResult) => {
      setResult(completedResult);
      setDrawerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    [queryClient, setResult]
  );

  return {
    savedResult: result,
    drawerOpen,
    openDrawer,
    closeDrawer,
    handleComplete
  };
}
