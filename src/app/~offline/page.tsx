'use client';

import { useTranslations } from '@/i18n';
import { RotateCw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/**
 *
 */
export default function Offline() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className='container flex flex-col items-center'>
      <Image
        className='mt-32'
        width={250}
        height={250}
        alt={t('media.offline_alt')}
        src={'/images/Loading-Time.svg'}
      />
      <h2 className='mt-2 text-center font-mono text-2xl font-semibold'>
        {t('offline.title')}
      </h2>

      <button
        className='mt-8 cursor-pointer'
        type='button'
        onClick={() => router.back()}
      >
        <div className='flex items-center'>
          <span className='font-mono text-2xl font-semibold underline'>
            {t('offline.retry')}
          </span>
          <RotateCw className='ml-2' width={21} height={21} />
        </div>
      </button>
    </div>
  );
}
