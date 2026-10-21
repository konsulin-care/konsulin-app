'use client';

import { useTranslations } from '@/i18n';
import { LogOut, Trash2, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type IconKey = 'logout' | 'trash2';

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  logout: LogOut,
  trash2: Trash2
};

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
  const t = useTranslations('profile');
  const router = useRouter();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({
    title: '',
    subTitle: '',
    show: false
  });

  const actionConfig: Record<
    string,
    { title: string; subTitle: string; confirmText: string }
  > = {
    '/logout': {
      title: t('logout_title'),
      subTitle: t('logout_desc'),
      confirmText: t('logout_confirm')
    },
    '/remove-account': {
      title: t('delete_title'),
      subTitle: t('delete_desc'),
      confirmText: t('delete_confirm')
    }
  };

  /** Open drawer for matching config paths; otherwise navigate directly. */
  function handleMenuClick(path: string) {
    const config = actionConfig[path];
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
    ? (actionConfig[pendingLink]?.confirmText ?? '')
    : '';

  return {
    drawerState,
    confirmText,
    handleMenuClick,
    confirmAction,
    closeDrawer
  };
}
