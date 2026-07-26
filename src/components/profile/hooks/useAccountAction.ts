'use client';

import { LogOut, Trash2, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type IconKey = 'logout' | 'trash2';

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  logout: LogOut,
  trash2: Trash2
};

const ACTION_CONFIG = {
  '/logout': {
    title: 'Apakah Anda Yakin Untuk Keluar Akun',
    subTitle:
      'Note that you need to login again in the\nfuture and the notification will not appears if you log out',
    confirmText: 'Yes, log me out'
  },
  '/remove-account': {
    title: 'Apakah Anda Yakin Untuk Hapus Akun',
    subTitle:
      'Note that you cannot retrieve any data from\nthis account in the app if you delete your account.',
    confirmText: 'Yes, delete my account'
  }
} as const;

type DrawerState = {
  title: string;
  subTitle: string;
  show: boolean;
};

/**
 * Manages account action confirmation flow.
 *
 * Tracks which action is pending (logout vs remove-account), opens the
 * confirmation drawer with action-specific text, and routes to the correct
 * destination on confirm.
 *
 * @returns Drawer state, confirm button text, and action handlers.
 */
export function useAccountAction() {
  const router = useRouter();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({
    title: '',
    subTitle: '',
    show: false
  });

  /** Open drawer for matching config paths; otherwise navigate directly. */
  function handleMenuClick(path: string) {
    const config = ACTION_CONFIG[path as keyof typeof ACTION_CONFIG];
    if (config) {
      setPendingLink(path);
      setDrawerState({
        title: config.title,
        subTitle: config.subTitle,
        show: true
      });
    } else {
      router.push(path);
    }
  }

  /** Close drawer and navigate to the pending link. */
  function confirmAction() {
    setDrawerState(s => ({ ...s, show: false }));
    if (pendingLink) router.push(pendingLink);
  }

  /** Close drawer without navigating. */
  function closeDrawer() {
    setDrawerState(s => ({ ...s, show: false }));
    setPendingLink(null);
  }

  const confirmText = pendingLink
    ? (ACTION_CONFIG[pendingLink as keyof typeof ACTION_CONFIG]?.confirmText ??
      '')
    : '';

  return {
    drawerState,
    confirmText,
    handleMenuClick,
    confirmAction,
    closeDrawer
  };
}
