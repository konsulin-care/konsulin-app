'use client';

import { AdminKeyGate } from '@/components/admin/admin-key-gate';
import { AdminRequestBuilder } from '@/components/admin/admin-request-builder';
import { isKeySet } from '@/lib/admin/session';
import { useEffect, useState } from 'react';

/**
 * Superadmin console page. Renders the key gate until a key session exists
 * (key held by the BFF in an HttpOnly cookie), then the dynamic request
 * builder that exercises every superadmin-capable endpoint.
 *
 * The key-set flag is read after mount (not during SSR prerender) so the
 * static export never renders a gate/builder mismatch.
 */
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (isKeySet()) setUnlocked(true);
  }, []);

  if (!unlocked) {
    return <AdminKeyGate onUnlocked={() => setUnlocked(true)} />;
  }
  return <AdminRequestBuilder />;
}
