'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useRecommendations, useSpecialties } from '@/services/recommendations';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import RecommendationCard from './recommendation-card';
import SpecialtyPickerModal from './specialty-picker-modal';

/**
 * Results list body — split for Suspense around useSearchParams.
 */
function RecommendationResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const specialty = searchParams.get('specialty') ?? '';

  const latRaw = searchParams.get('lat');
  const lonRaw = searchParams.get('lon');
  const lat = latRaw ? Number(latRaw) : undefined;
  const lon = lonRaw ? Number(lonRaw) : undefined;

  const params = specialty ? { specialty, lat, lon } : null;

  const { data, isLoading, isError, refetch } = useRecommendations(params);
  const { data: specialties = [], isLoading: isSpecialtiesLoading } =
    useSpecialties();

  /** Switch specialty (inline filter) and refetch via the new query key. */
  const changeSpecialty = (code: string) => {
    const prefix = `/recommendation?specialty=${encodeURIComponent(code)}`;
    const suffix =
      lat !== undefined && lon !== undefined ? `&lat=${lat}&lon=${lon}` : '';
    router.replace(prefix + suffix);
  };

  // No intent params — show the specialty picker (required before results).
  if (!specialty) {
    return (
      <SpecialtyPickerModal
        specialties={specialties}
        loading={isSpecialtiesLoading}
      />
    );
  }

  const recommendations = data?.recommendations ?? [];

  return (
    <>
      <PageHeader pageIndicator='Rekomendasi' backRoute='/' />

      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-lg font-semibold'>{specialty}</h1>
          <select
            aria-label='Ganti spesialisasi'
            value={specialty}
            onChange={e => changeSpecialty(e.target.value)}
            className='border-input bg-background h-9 rounded-lg border px-2 text-sm'
          >
            {specialties.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {renderBody()}
      </div>
    </>
  );

  function renderBody() {
    if (isLoading) {
      return (
        <div className='flex min-h-[300px] items-center justify-center'>
          <LoadingSpinnerIcon
            width={40}
            height={40}
            className='w-full animate-spin'
          />
        </div>
      );
    }
    if (isError) {
      return (
        <div className='flex min-h-[300px] flex-col items-center justify-center gap-3 text-center'>
          <p className='text-sm text-red-600'>
            Gagal memuat rekomendasi. Silakan coba lagi.
          </p>
          <Button
            variant='outline'
            onClick={() => {
              void refetch();
            }}
          >
            Coba Lagi
          </Button>
        </div>
      );
    }
    if (recommendations.length === 0) {
      return (
        <div className='flex min-h-[300px] items-center justify-center'>
          <p className='text-muted-foreground text-sm'>
            Belum ada rekomendasi untuk spesialisasi ini.
          </p>
        </div>
      );
    }
    return (
      <div className='mt-4 flex flex-col gap-3 pb-6'>
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.practitionerRoleId}
            recommendation={recommendation}
          />
        ))}
      </div>
    );
  }
}

/**
 * Recommendation results page (`/recommendation`).
 *
 * Requires a `specialty` intent param; without it the specialty picker modal
 * appears. lat/lon optionally narrow results by proximity server-side.
 */
export default function RecommendationPage() {
  return (
    <Suspense fallback={null}>
      <RecommendationResults />
    </Suspense>
  );
}
