'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'profile_completeness_dismissed';

type Props = {
  readonly show: boolean;
};

/**
 *
 */
export default function CompletenessBanner({ show }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISS_KEY);
    if (stored === 'true') setDismissed(true);
  }, []);

  if (!show || dismissed) return null;

  /** Dismiss the banner and persist dismissal state to sessionStorage. */
  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <div className='mx-4 mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 text-sm text-amber-800'>
          <p className='font-medium'>Your profile is incomplete.</p>
          <p className='mt-1 text-amber-700'>
            Please update your information to complete registration.
          </p>
        </div>
        <button
          onClick={() => {
            router.push('/profile?path=edit-profile');
          }}
          className='shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700'
        >
          Edit Profile
        </button>
        <button
          onClick={handleDismiss}
          className='shrink-0 text-amber-400 hover:text-amber-600'
          aria-label='Dismiss'
        >
          <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
            <path d='M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z' />
          </svg>
        </button>
      </div>
    </div>
  );
}
