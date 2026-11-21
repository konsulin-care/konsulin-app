'use client';
/* eslint-disable sonarjs/no-redundant-jump, consistent-return */

import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PROFILE_ROUTE_PREFIX = '/profile';
const MODAL_DELAY_MS = 3000;

/** Modal prompting user to complete their profile. */
const ProfileCompletenessModal = () => {
  const t = useTranslations('profile');
  const { isLoading, state: authState } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const isProfileRoute = pathname.startsWith(PROFILE_ROUTE_PREFIX);

  useEffect(() => {
    if (
      !isLoading &&
      authState.isAuthenticated &&
      !isProfileRoute &&
      authState.userInfo?.profile_complete !== true &&
      !dismissed
    ) {
      const timer = setTimeout(() => setIsOpen(true), MODAL_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setIsOpen(false);
    return;
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
        className='bg-card relative w-[90%] max-w-md rounded-xl p-6 text-center shadow-lg'
        role='dialog'
        aria-modal='true'
        aria-labelledby='profile-completeness-title'
        aria-describedby='profile-completeness-description'
        onClick={e => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type='button'
          className='text-muted-foreground hover:text-charcoal-700 absolute top-3 right-3'
          aria-label={t('close_completeness_prompt')}
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
          {t('incomplete_modal_title')}
        </h2>
        <p
          id='profile-completeness-description'
          className='text-muted-foreground mb-4 text-sm'
        >
          {t('incomplete_modal_desc')}
        </p>
        <button
          type='button'
          className='bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-4 py-2'
          onClick={() => {
            setIsOpen(false);
            router.push('/profile');
          }}
        >
          {t('complete_profile')}
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletenessModal;
