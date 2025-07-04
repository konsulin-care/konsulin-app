'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const storedRedirect = localStorage.getItem('redirect');
      if (storedRedirect) {
        localStorage.removeItem('redirect');
        router.push(decodeURIComponent(storedRedirect));
        return;
      }
      setIsRedirecting(false);
    }
  }, [isLoading]);

  if (isLoading || isRedirecting) {
    return (
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-[16px] bg-white pb-[100px] pt-4'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  return (
    <>
      <NavigationBar />
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
