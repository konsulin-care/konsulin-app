'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ResearchForm from './research-form';

/** Registration page for creating new research studies. */
export default function RegisterPage() {
  const router = useRouter();
  const { state: authState, isLoading } = useAuth();

  const role = authState?.userInfo?.role_name;
  const isResearcher = role === Roles.Researcher;

  useEffect(() => {
    if (!isLoading && !isResearcher) {
      router.push('/');
    }
  }, [isLoading, isResearcher, router]);

  if (isLoading || !isResearcher) {
    return null;
  }

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          <ResearchForm />
        </div>
      </ContentWraper>
    </>
  );
}
