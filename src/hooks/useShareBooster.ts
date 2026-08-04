'use client';

import {
  readShareCount,
  shareBadgeFor,
  writeShareCount,
  type ShareBadge
} from '@/utils/referral';
import { useCallback, useState } from 'react';

/**
 * Local share-booster counter with milestone badges.
 *
 * Reads and writes the counter from localStorage so repeated shares are
 * rewarded across sessions (badges at 1/3/5 shares).
 *
 * @returns The current count, the unlocked badge (or null), and increment.
 */
export function useShareBooster(): {
  count: number;
  badge: ShareBadge | null;
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

  const badge = shareBadgeFor(count);

  return { count, badge, increment };
}
