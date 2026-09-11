'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { useResearcherDashboard } from '@/services/api/researcher';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/** Stat card displaying a single metric. */
function StatCard({
  label,
  value,
  isError
}: Readonly<{ label: string; value: number | string; isError: boolean }>) {
  return (
    <div className='card flex items-center gap-4 p-4'>
      <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E6F7F7]'>
        <FlaskConical className='text-[#13C2C2]' />
      </div>
      <div>
        <div className='text-[24px] font-bold'>{isError ? '-' : value}</div>
        <div className='text-[12px] text-gray-500'>{label}</div>
      </div>
    </div>
  );
}

/** Study card displaying title, status, batch info, and days remaining. */
function StudyCard({ study }: Readonly<{ study: ResearchStudyWithBatches }>) {
  const { study: studyResource, batches, currentBatch, daysRemaining } = study;
  const statusColor =
    studyResource.status === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';

  return (
    <Link
      href={`/research?view=${studyResource.id}`}
      className='card block p-4 transition-all hover:shadow-md'
    >
      <div className='flex items-start gap-3'>
        <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F0F5FF]'>
          <FlaskConical className='text-[#2F54EB]' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='truncate text-[14px] font-bold text-gray-800'>
              {studyResource.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
            >
              {studyResource.status}
            </span>
          </div>
          <div className='mt-1 text-[12px] text-gray-500'>
            {batches.length} batch{batches.length === 1 ? '' : 'es'}
            {currentBatch && (
              <span>
                {' '}
                · Batch closes in {daysRemaining} day
                {daysRemaining === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Researcher home dashboard showing managed studies and stats. */
export default function ResearcherDashboard() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  const { data, isLoading, isError } = useResearcherDashboard(practitionerId);

  const loading = isAuthLoading || isLoading;

  if (loading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]' />
        <CardLoader item={2} height='h-[80px]' />
      </div>
    );
  }

  const studies = data?.studies ?? [];
  const totalParticipants = data?.totalParticipants ?? 0;
  const activeBatches = studies.filter(s => s.currentBatch !== null).length;

  return (
    <>
      {/* Stat cards */}
      <div className='flex flex-col gap-4 p-4'>
        <StatCard
          label='Ongoing Studies'
          value={studies.length}
          isError={isError}
        />
        <StatCard
          label='Total Participants'
          value={totalParticipants}
          isError={isError}
        />
        <StatCard
          label='Active Batches'
          value={activeBatches}
          isError={isError}
        />
      </div>

      {/* Study list */}
      <section className='p-4'>
        <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          My Research
        </h2>
        {studies.length === 0 ? (
          <EmptyState
            title='No research studies yet'
            subtitle='You have not registered any research studies.'
          />
        ) : (
          <div className='flex flex-col gap-4'>
            {studies.map(studyWithBatches => (
              <StudyCard
                key={studyWithBatches.study.id}
                study={studyWithBatches}
              />
            ))}
          </div>
        )}
      </section>

      {isError && (
        <div className='px-4 pb-4'>
          <button
            type='button'
            className='text-secondary w-full rounded-lg border border-gray-200 py-2 text-[12px]'
          >
            Failed to load research data. Tap to retry.
          </button>
        </div>
      )}
    </>
  );
}
