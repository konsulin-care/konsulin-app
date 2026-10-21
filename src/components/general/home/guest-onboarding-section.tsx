'use client';

import ActionCard from '@/components/general/action-card';
import { useTranslations } from '@/i18n';
import { BookText, Calendar, HeartPulse } from 'lucide-react';

/**
 *
 */
export default function GuestOnboardingSection() {
  const t = useTranslations('home');

  const features = [
    {
      id: 'checkups',
      icon: <HeartPulse className='h-5 w-5 text-gray-600' />,
      title: t('mental_health'),
      description: t('mental_health_desc'),
      href: '/assessments'
    },
    {
      id: 'journal',
      icon: <BookText className='h-5 w-5 text-gray-600' />,
      title: t('journal'),
      description: t('journal_desc'),
      href: '/auth?redirectToPath=/journal'
    },
    {
      id: 'sessions',
      icon: <Calendar className='h-5 w-5 text-gray-600' />,
      title: t('sessions'),
      description: t('sessions_desc'),
      href: '/recommendation'
    }
  ];

  return (
    <div className='px-4 pb-4'>
      <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
        {t('start_wellness')}
      </h2>
      <div className='flex flex-col gap-3'>
        {features.map(feature => (
          <ActionCard key={feature.id} {...feature} />
        ))}
      </div>
    </div>
  );
}
