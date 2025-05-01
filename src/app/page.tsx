'use client';

import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { getCookie } from 'cookies-next';
import { useEffect } from 'react';
import Session from 'supertokens-auth-react/recipe/session';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { state: authState, dispatch } = useAuth();
  let session = false;

  useEffect(() => {
    const fetchSession = async () => {
      session = await Session.doesSessionExist();
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));
      const payload = {
        role_name: auth.role_name || 'guest',
        fullname: auth.fullname || auth.email,
        email: auth.email,
        userId: auth.userId,
        profile_picture: auth.profile_picture,
        fhirId: auth.fhirId
      };

      if (session && !authState.userInfo.userId) {
        dispatch({ type: 'login', payload });
      }
    };
    fetchSession();
  }, [session, authState.userInfo.userId]);

  return (
    <>
      <NavigationBar />
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
