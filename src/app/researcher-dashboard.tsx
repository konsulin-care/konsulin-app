'use client';

import CardLoader from '@/components/general/card-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useResearcherDashboard } from '@/services/api/researcher';
import { FlaskConical } from 'lucide-react';

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
