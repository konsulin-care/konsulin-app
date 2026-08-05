'use client';

import { readShareCount, writeShareCount } from '@/utils/referral';
import { useCallback, useState } from 'react';

/**
 * Local share-booster counter feeding the research XP engine.
 *
 * Reads and writes the counter from localStorage so repeated shares are
 * rewarded across sessions (each share counts as 1 XP).
 *
 * @returns The current count and the increment function.
 */
export function useShareBooster(): {
  count: number;
  increment: () => void;
} {
  const [count, setCount] = useState(() =>
    typeof window === 'undefined' ? 0 : readShareCount(window.localStorage)
  );

  const increment = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      writeShareCount(window.localStorage, next);
      return next;
    });
  }, []);

  return { count, increment };
}
