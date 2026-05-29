'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useProfile } from '@/context/profile/profileContext';
import { clearUserData } from '@/lib/indexeddb';
import { useEffect } from 'react';
import Session from 'supertokens-auth-react/recipe/session';

export default function Logout() {
  const { state, dispatch } = useAuth();
  const { dispatch: dispatchProfile } = useProfile();

  useEffect(() => {
    const handleLogout = async () => {
      const ownerId = state.userInfo.userId || '';
      await Session.signOut();
      await clearUserData(ownerId);
      dispatch({ type: 'logout' });
      dispatchProfile({ type: 'reset' });
      window.location.href = '/';
    };

    handleLogout();
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
