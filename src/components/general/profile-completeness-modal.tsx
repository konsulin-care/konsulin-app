'use client';

import { useAuth } from '@/context/auth/authContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PROFILE_ROUTE_PREFIX = '/profile';
const MODAL_DELAY_MS = 3000;

const ProfileCompletenessModal = () => {
  const { isLoading, state: authState } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const isProfileRoute = pathname.startsWith(PROFILE_ROUTE_PREFIX);

  useEffect(() => {
    setIsOpen(false);
    setDismissed(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (!authState.isAuthenticated) {
      setIsOpen(false);
      return;
    }
    if (isProfileRoute) {
      setIsOpen(false);
      return;
    }
    if (authState.userInfo?.profile_complete === true) {
      setIsOpen(false);
      return;
    }
    if (dismissed) {
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    isLoading,
    authState.isAuthenticated,
    authState.userInfo?.profile_complete,
    isProfileRoute,
    dismissed
  ]);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
      onClick={() => {
        setIsOpen(false);
        setDismissed(true);
      }}
    >
      <div
        className='relative w-[90%] max-w-md rounded-xl bg-white p-6 text-center shadow-lg'
        role='dialog'
        aria-modal='true'
        aria-labelledby='profile-completeness-title'
        aria-describedby='profile-completeness-description'
        onClick={e => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type='button'
          className='absolute right-3 top-3 text-gray-500 hover:text-gray-700'
          aria-label='Close profile completeness prompt'
          onClick={() => {
            setIsOpen(false);
            setDismissed(true);
          }}
        >
          ×
        </button>
        <h2
          id='profile-completeness-title'
          className='mb-2 text-lg font-semibold'
        >
          Profil belum lengkap
        </h2>
        <p
          id='profile-completeness-description'
          className='mb-4 text-sm text-gray-600'
        >
          Lengkapi profil Anda untuk mendapatkan pengalaman terbaik.
        </p>
        <button
          type='button'
          className='bg-secondary inline-flex items-center justify-center rounded-lg px-4 py-2 text-white'
          onClick={() => {
            setIsOpen(false);
            router.push('/profile');
          }}
        >
          Lengkapi Sekarang
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletenessModal;
