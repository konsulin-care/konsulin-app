'use client';

import { useTranslations } from '@/i18n';
import { RotateCw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 *
 */
export default function Unauthorized() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className='container flex flex-col items-center'>
      <Image
        className='mt-32'
        width={250}
        height={250}
        alt={t('unauthorized.image_alt')}
        src={'/images/Fast-Internet.svg'}
      />
      <h2 className='mt-2 text-center font-mono text-2xl font-semibold'>
        {t('unauthorized.title')}
      </h2>
      <p className='text-sm opacity-50'>{t('unauthorized.description')}</p>

      <button
        className='mt-8 cursor-pointer'
        type='button'
        onClick={() => router.push('/')}
      >
        <div className='flex items-center'>
          <span className='font-mono text-2xl font-semibold underline'>
            {t('unauthorized.go_home')}
          </span>
          <RotateCw className='ml-2' width={21} height={21} />
        </div>
      </button>
    </div>
  );
}
