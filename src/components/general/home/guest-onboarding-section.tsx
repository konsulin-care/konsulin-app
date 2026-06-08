'use client';

import ActionCard from '@/components/general/action-card';
import { BookText, Calendar, HeartPulse } from 'lucide-react';

const FEATURES = [
  {
    icon: <HeartPulse className='h-5 w-5 text-gray-600' />,
    title: 'Mental Health Checkups',
    description:
      'Take quick, private assessments to understand your well-being',
    href: '/assessments'
  },
  {
    icon: <BookText className='h-5 w-5 text-gray-600' />,
    title: 'Personal Journal',
    description: 'Track your thoughts and progress over time',
    href: '/auth'
  },
  {
    icon: <Calendar className='h-5 w-5 text-gray-600' />,
    title: 'Expert Sessions',
    description: 'Book appointments with licensed professionals',
    href: '/auth'
  }
];

/**
 *
 */
export default function GuestOnboardingSection() {
  return (
    <div className='px-4 pb-4'>
      <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
        Start Your Wellness Journey
      </h2>
      <div className='flex flex-col gap-3'>
        {FEATURES.map(feature => (
          <ActionCard key={feature.href} {...feature} />
        ))}
      </div>
    </div>
  );
}
