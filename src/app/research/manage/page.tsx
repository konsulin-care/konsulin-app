'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { useResearcherDashboard } from '@/services/api/researcher';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import ManageStudyView from './manage-study-view';

/**
 * Skeleton shown while the researcher dashboard data is loading.
 *
 * @returns The placeholder layout.
 */
function ManageSkeleton() {
  const t = useTranslations('research');

  return (
    <div
      aria-label={t('loading_label')}
      className='flex flex-col gap-6'
      data-testid='manage-skeleton'
    >
      <Skeleton className='h-8 w-64' />
      <div className='grid gap-6 lg:grid-cols-3'>
        <Skeleton className='h-40 lg:col-span-2' />
        <Skeleton className='h-40' />
      </div>
    </div>
  );
}

/**
 * Manage page for a single researcher study, selected by the `id` query
 * parameter. Researcher-only: other roles are sent back to the home page.
 *
 * @returns The manage page, or null while auth is loading.
 */
export default function ManagePage() {
  const t = useTranslations('research');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState, isLoading } = useAuth();
  const studyId = searchParams.get('id');

  const role = authState?.userInfo?.role_name;
  const isResearcher = role === Roles.Researcher;
  const fhirId = authState?.userInfo?.fhirId;

  const { data, isLoading: isDashboardLoading } = useResearcherDashboard(
    isResearcher ? fhirId : undefined
  );

  useEffect(() => {
    if (!isLoading && !isResearcher) {
      router.push('/');
    }
  }, [isLoading, isResearcher, router]);

  const study = useMemo(
    () => data?.studies.find(entry => entry.study.id === studyId) ?? null,
    [data, studyId]
  );

  if (isLoading || !isResearcher) {
    return null;
  }

  const loading = isDashboardLoading || !data;

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          {loading ? <ManageSkeleton /> : null}
          {!loading && !study ? (
            <div className='flex flex-col gap-1'>
              <p className='text-foreground text-sm'>{t('manage.not_found')}</p>
              <p className='text-muted-foreground text-xs'>{studyId}</p>
            </div>
          ) : null}
          {!loading && study ? <ManageStudyView study={study} /> : null}
        </div>
      </ContentWraper>
    </>
  );
}
