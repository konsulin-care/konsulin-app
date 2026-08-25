'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useProfile } from '@/context/profile/profileContext';
import { clearUserData } from '@/lib/indexeddb';
import { clearLastInterviewResult } from '@/utils/recommendation-interview';
import { useEffect } from 'react';
import Session from 'supertokens-auth-react/recipe/session';

/**
 *
 */
export default function Logout() {
  const { state, dispatch } = useAuth();
  const { dispatch: dispatchProfile } = useProfile();

  useEffect(() => {
    /** Handles user logout and data cleanup. */
    const handleLogout = async () => {
      const ownerId = state.userInfo?.userId ?? '';
      await Session.signOut();
      await clearUserData(ownerId);
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
      window.location.href = '/';
    };

    handleLogout().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
