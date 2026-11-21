'use client';

import { useTranslations } from '@/i18n';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'profile_completeness_dismissed';

type Props = {
  readonly show: boolean;
};

/**
 *
 */
export default function CompletenessBanner({ show }: Props) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
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
    <div className='border-warning-deep bg-warning-tint mx-4 mb-2 rounded-lg border p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='text-warning-deep flex-1 text-sm'>
          <p className='font-medium'>{t('incomplete')}</p>
          <p className='mt-1'>{t('incomplete_desc')}</p>
        </div>
        <button
          type='button'
          onClick={handleDismiss}
          className='text-warning-deep hover:text-charcoal-900 shrink-0'
          aria-label={tCommon('dismiss')}
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 16 16'
            fill='currentColor'
            aria-hidden='true'
            focusable='false'
          >
            <path d='M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z' />
          </svg>
        </button>
      </div>
    </div>
  );
}
