'use client';

import ActionCard from '@/components/general/action-card';
import GuestOnboardingSection from '@/components/general/home/guest-onboarding-section';
import { Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const RecommendationCardStack = dynamic(
  () => import('@/components/general/home/recommendation-card-stack'),
  { ssr: false }
);

/** Guest home page with recommendation stack and login CTA. */
export default function HomeContentGuest() {
  const router = useRouter();

  /** Redirect guest to auth page to book an appointment. */
  const handleBook = () => {
    router.push('/auth');
  };

  return (
    <>
      {/* PRIMARY: Recommendation Card Stack */}
      <div className='p-4'>
        <RecommendationCardStack onBook={handleBook} />
      </div>

      {/* SECONDARY: Feature Onboarding */}
      <GuestOnboardingSection />

      {/* TERTIARY: Quick Actions */}
      <div className='px-4 pb-4'>
        <ActionCard
          icon={<Building2 className='h-5 w-5 text-gray-600' />}
          title='Show All Clinics'
          description='Login to browse clinics'
          href='/auth'
        />
      </div>
    </>
  );
}
