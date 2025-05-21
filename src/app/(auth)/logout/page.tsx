'use client';

import { useAuth } from '@/context/auth/authContext';
import { useProfile } from '@/context/profile/profileContext';
import { useEffect } from 'react';

export default function Logout() {
  const { dispatch } = useAuth();
  const { dispatch: dispatchProfile } = useProfile();

  useEffect(() => {
    dispatch({ type: 'logout' });
    dispatchProfile({ type: 'reset' });

    // redirect to dashboard and reload the page after logout
    window.location.href = '/';
  }, []);

  return null;
}
