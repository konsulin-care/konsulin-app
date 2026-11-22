'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/auth/authContext';
import { useProfile } from '@/context/profile/profileContext';
import { useTranslations } from '@/i18n';
import { clearUserData } from '@/lib/indexeddb';
import { ownerKeyFor, type ReplayIdentity } from '@/lib/submission-owner';
import {
  listOwnedSubmissions,
  replayPendingSubmissions
} from '@/lib/submission-queue';
import { clearLastInterviewResult } from '@/utils/recommendation-interview';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Session from 'supertokens-auth-react/recipe/session';

/** Owner info kept while the logout confirmation dialog is open. */
interface PendingLogout {
  ownerId: string;
  queueOwnerKey: string;
}

/** Sign out, clear local data and navigate home. */
async function finishLogout(
  ownerId: string,
  queueOwnerKey: string | undefined,
  dispatch: ReturnType<typeof useAuth>['dispatch'],
  dispatchProfile: ReturnType<typeof useProfile>['dispatch'],
  router: ReturnType<typeof useRouter>
): Promise<void> {
  await Session.signOut();
  await (queueOwnerKey
    ? clearUserData(ownerId, { queueOwnerKey })
    : clearUserData(ownerId));
  await clearLastInterviewResult();
  const csrfRes = await fetch('/auth/cookie/csrf-token');
  const csrfToken = csrfRes.ok
    ? (((await csrfRes.json()) as { token?: string }).token ?? '')
    : '';
  await fetch('/auth/cookie', {
    method: 'DELETE',
    headers: { ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) }
  }).catch((err: unknown) =>
    console.error('[auth:cookie] failed to clear auth cookie', err)
  );
  dispatch({ type: 'logout' });
  dispatchProfile({ type: 'reset' });
  router.push('/');
}

/**
 * Logout page: replays queued submissions while the session still exists,
 * asks whether to keep or discard remaining owned items, then signs out.
 */
export default function Logout() {
  const { state, dispatch, isLoading } = useAuth();
  const { dispatch: dispatchProfile } = useProfile();
  const router = useRouter();
  const t = useTranslations('common');
  const [pending, setPending] = useState<PendingLogout | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    const ownerId = state.userInfo?.userId ?? '';
    const identity: ReplayIdentity = {
      ownerKey: ownerKeyFor({
        isAuthenticated: state.isAuthenticated,
        role: state.userInfo.role_name,
        fhirId: state.userInfo.fhirId
      }),
      isGuest: !state.isAuthenticated
    };

    /** Replay first, then ask about remaining items or finish logging out. */
    const handleLogout = async () => {
      await replayPendingSubmissions(identity);
      const remaining = await listOwnedSubmissions(
        identity.ownerKey,
        identity.isGuest
      );
      if (remaining.length > 0) {
        setPending({ ownerId, queueOwnerKey: identity.ownerKey });
        return;
      }
      await finishLogout(ownerId, undefined, dispatch, dispatchProfile, router);
    };

    handleLogout().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  /** Keeps the remaining queue items and continues logging out. */
  const handleKeep = (): void => {
    if (!pending) return;
    const { ownerId } = pending;
    setPending(null);
    finishLogout(ownerId, undefined, dispatch, dispatchProfile, router).catch(
      console.error
    );
  };

  /** Discards the remaining queue items and continues logging out. */
  const handleDiscard = (): void => {
    if (!pending) return;
    const { ownerId, queueOwnerKey } = pending;
    setPending(null);
    finishLogout(
      ownerId,
      queueOwnerKey,
      dispatch,
      dispatchProfile,
      router
    ).catch(console.error);
  };

  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
      <AlertDialog open={pending !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pwa.logout_pending_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pwa.logout_pending_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeep}>
              {t('pwa.logout_keep')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              {t('pwa.logout_discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
