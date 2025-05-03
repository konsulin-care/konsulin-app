'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { isLoading } = useAuth();

  return (
    <>
      <NavigationBar />
      <HomeHeader />
      {isLoading ? (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={60}
            height={60}
            className='w-full animate-spin'
          />
        </div>
      ) : (
        <HomeContent />
      )}
    </>
  );
};

export default App;
