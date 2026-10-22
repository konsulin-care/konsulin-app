'use client';

import { useTranslations } from '@/i18n';

/** Informed consent copy of the consent drawer (body content only). */
export default function ConsentDrawerContent() {
  const t = useTranslations('research');
  return (
    <div className='space-y-3 text-xs leading-5 text-gray-600'>
      <p>{t('consent_intro')}</p>
      <p className='font-bold text-gray-800'>{t('consent_by_heading')}</p>
      <ul className='list-disc space-y-1 pl-4'>
        <li>{t('consent_bullet_1')}</li>
        <li>{t('consent_bullet_2')}</li>
        <li>{t('consent_bullet_3')}</li>
      </ul>
      <p>{t('consent_referral')}</p>
      <p>{t('consent_rights')}</p>
    </div>
  );
}
