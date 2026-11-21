'use client';

import {
  getStatus,
  initConnectivity,
  subscribe,
  type ConnectivityStatus
} from '@/lib/connectivity';
import { useEffect, useState } from 'react';

/**
 * Subtle bar shown while the connection is flaky or offline.
 * Renders nothing when the connection is stable.
 */
export default function ConnectivityIndicator() {
  const [status, setStatus] = useState<ConnectivityStatus>(() => getStatus());

  useEffect(() => {
    initConnectivity();
    return subscribe(setStatus);
  }, []);

  if (status === 'stable') return null;

  const message =
    status === 'offline'
      ? 'You are offline'
      : 'Connection unstable — retrying…';

  return (
    <output className='border-border bg-warning-tint text-warning-deep flex items-center justify-center border-b px-4 py-2 text-center text-xs'>
      {message}
    </output>
  );
}
