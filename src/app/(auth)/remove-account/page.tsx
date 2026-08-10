'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useProfile } from '@/context/profile/profileContext';
import { clearUserData } from '@/lib/indexeddb';
import { purgeResearchData } from '@/services/api/privacy';
import { clearReferralLocalState } from '@/utils/referral';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Session from 'supertokens-auth-react/recipe/session';

/**
 * Handles account erasure after the user confirms deletion.
 *
 * Fires the backend purge (DELETE /proxy/api/v1/privacy/purge), then clears
 * the local referral state, IndexedDB user data, and the auth session before
 * redirecting home. On purge failure, keeps local state intact and returns to
 * the profile page. The ref guard prevents a double purge in dev StrictMode.
 */
export default function RemoveAccount() {
  const { state, dispatch } = useAuth();
  const { dispatch: dispatchProfile } = useProfile();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    /** Purges server data, then clears local state and session. */
    const handleRemoveAccount = async () => {
      const ownerId = state.userInfo?.userId ?? '';
      try {
        await purgeResearchData();
        clearReferralLocalState(window.localStorage);
        await clearUserData(ownerId);
        // Account is already deleted server-side; local sign-out is best-effort.
        await Session.signOut().catch((err: unknown) => {
          console.error('[remove-account] session sign-out failed', err);
        });
        const csrfRes = await fetch('/auth/cookie/csrf-token');
        const csrfToken = csrfRes.ok
          ? (((await csrfRes.json()) as { token?: string }).token ?? '')
          : '';
        await fetch('/auth/cookie', {
          method: 'DELETE',
          headers: { ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) }
        }).catch((err: unknown) => {
          console.error('[auth:cookie] failed to clear auth cookie', err);
        });
        dispatch({ type: 'logout' });
        dispatchProfile({ type: 'reset' });
        router.push('/');
      } catch (err) {
        console.error('[remove-account] purge failed', err);
        router.push('/profile');
      }
    };

    // skipcq: JS-0098 - fire-and-forget account purge; errors handled inside
    void handleRemoveAccount();
  }, [state, router, dispatch, dispatchProfile]);

  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  );
}
