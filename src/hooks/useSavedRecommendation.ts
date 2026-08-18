'use client';

import type { InterviewResult } from '@/types/recommendation-interview';
import { readLastInterviewResult } from '@/utils/recommendation-interview';
import { useCallback, useEffect, useState } from 'react';

/**
 * Shared patient/guest home hook: loads the persisted recommendation result
 * from IndexedDB once on mount and exposes the drawer/complete lifecycle.
 *
 * Homepage renders the recommendation stack inline, so completing the
 * screening here updates `savedResult` in place instead of navigating.
 *
 * @returns savedResult, drawer state, and lifecycle callbacks
 */
export function useSavedRecommendation() {
  const [savedResult, setSavedResult] = useState<InterviewResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await readLastInterviewResult();
        if (active) setSavedResult(result);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleComplete = useCallback((result: InterviewResult) => {
    setSavedResult(result);
    setDrawerOpen(false);
  }, []);

  return {
    savedResult,
    drawerOpen,
    openDrawer,
    closeDrawer,
    handleComplete
  };
}
