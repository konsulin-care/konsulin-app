'use client';

import { BookText, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const RecommendationCardStack = dynamic(
  () => import('@/components/general/home/recommendation-card-stack'),
  { ssr: false }
);

export default function HomeContentGuest() {
  const router = useRouter();

  const handleBook = () => {
    router.push('/auth');
  };

  return (
    <>
      {/* PRIMARY: Recommendation Card Stack */}
      <div className='p-4'>
        <RecommendationCardStack onBook={handleBook} />
      </div>

      {/* SECONDARY: Quick Actions */}
      <div className='px-4 pb-4'>
        <div className='flex gap-4'>
          <Link
            href='/auth'
            className='card flex w-full items-center gap-3 p-4'
          >
            <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
              <BookText className='h-5 w-5 text-gray-600' />
            </div>
            <div className='flex flex-col'>
              <span className='text-primary text-[12px] font-bold'>
                Write Journal
              </span>
              <span className='text-primary text-[10px]'>
                Login to start journaling
              </span>
            </div>
          </Link>

          <Link
            href='/auth'
            className='card flex w-full items-center gap-3 p-4'
          >
            <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
              <Building2 className='h-5 w-5 text-gray-600' />
            </div>
            <div className='flex flex-col'>
              <span className='text-primary text-[12px] font-bold'>
                Show All Clinics
              </span>
              <span className='text-primary text-[10px]'>
                Login to browse clinics
              </span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
