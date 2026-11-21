'use client';

import { clearKeyFlag } from '@/lib/admin/session';
import { clearAdminKey } from '@/services/admin-api';
import { LockIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Minimal shell for the /admin subtree. Rendered by the route gate instead of
 * AppChrome so the page carries no SuperTokens providers, FABs, connectivity
 * widgets, or profile modals. The header shows the console title and a lock
 * button that clears the BFF-held key cookie and the session flag.
 */
export function AdminShell({ children }: Readonly<AdminShellProps>) {
  /** Clears the BFF-held key cookie and reloads the page. */
  const handleLock = () => {
    // skipcq: JS-0098 — void discards promise rejection in event handler
    void (async () => {
      try {
        await clearAdminKey();
      } finally {
        clearKeyFlag();
        window.location.reload();
      }
    })();
  };

  return (
    <div className='bg-background flex min-h-screen flex-col'>
      <header className='border-border bg-card flex h-14 items-center justify-between border-b px-6'>
        <span className='font-semibold tracking-tight'>Superadmin Console</span>
        <button
          type='button'
          onClick={handleLock}
          className='border-border hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm'
        >
          <LockIcon width={14} height={14} />
          Lock
        </button>
      </header>
      <main className='mx-auto w-full max-w-4xl grow p-6'>{children}</main>
    </div>
  );
}
