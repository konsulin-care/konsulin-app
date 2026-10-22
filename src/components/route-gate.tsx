'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import AppChrome from '@/components/app-chrome';
import { AppProviders } from '@/components/providers';
import { isAdminPath } from '@/lib/admin/route-gate';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Route gate in the root layout. Renders a minimal admin shell (no
 * SuperTokens providers, no AppChrome, no FAB/profile/connectivity widgets)
 * for /admin paths, and the full app provider stack + chrome everywhere else.
 * SuperTokens session bootstrap must never run inside the superadmin console.
 */
export function RouteGate({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  if (isAdminPath(pathname)) {
    return <AdminShell>{children}</AdminShell>;
  }

  return (
    <AppProviders>
      <AppChrome>{children}</AppChrome>
    </AppProviders>
  );
}
