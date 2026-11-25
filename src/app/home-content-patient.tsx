'use client';

import ActionCard from '@/components/general/action-card';
import RecommendationCardStack from '@/components/general/home/recommendation-card-stack';
import RecommendationRefreshCard from '@/components/general/home/recommendation-refresh-card';
import ScreeningDrawer from '@/components/screening-drawer';
import RecordCard from '@/components/shared/record-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { useSavedRecommendation } from '@/hooks/useSavedRecommendation';
import { useTranslations } from '@/i18n';
import { useRecommendations } from '@/services/recommendations';
import type { IRecord } from '@/types/record';
import { buildRecommendationParams } from '@/utils/recommendation-interview';
import { Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Diamonds empty-state prompting the patient to start the interview. */
function EmptyRecommendationState({
  onStart,
  t
}: Readonly<{ onStart: () => void; t: (key: string) => string }>) {
  return (
    <div className='px-4 pt-4'>
      <div className='border-border bg-muted rounded-2xl border border-dashed p-6 text-center'>
        <Sparkles
          className='text-turquoise-deep mx-auto mb-3 h-6 w-6'
          aria-hidden='true'
        />
        <p className='text-charcoal-700 mb-1 text-[14px] font-bold'>
          {t('get_matched')}
        </p>
        <p className='text-muted-foreground mb-4 text-[12px]'>
          {t('start_assessment')}
        </p>
        <Button
          variant='default'
          onClick={onStart}
          className='bg-primary text-primary-foreground'
        >
          {t('start_assessment')}
        </Button>
      </div>
    </div>
  );
}

/** Patient home page with live recommendations, clinic link, and records. */
export default function HomeContentPatient() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const patientId = authState?.userInfo?.fhirId;

  const {
    savedResult,
    coords,
    drawerOpen,
    openDrawer,
    closeDrawer,
    handleComplete
  } = useSavedRecommendation();

  const {
    data: recommendationsData,
    isLoading: isRecLoading,
    isError: isRecError
  } = useRecommendations(
    savedResult
      ? buildRecommendationParams(savedResult, coords?.lat, coords?.lon)
      : null
  );

  const {
    records,
    isLoading: isRecordsLoading,
    titlesLoading,
    error
  } = usePatientRecords(patientId);

  /** Navigate to the practitioner booking page. */
  const handleBook = (
    practitionerRoleId: string,
    healthcareServiceId: string
  ) => {
    router.push(
      `/practitioner/availability?id=${practitionerRoleId}&service=${healthcareServiceId}`
    );
  };

  /** Renders the live recommendation stack, loading, or empty variants. */
  const renderRecommendations = () => {
    if (!savedResult) {
      return <EmptyRecommendationState onStart={openDrawer} t={t} />;
    }
    if (isRecLoading) {
      return (
        <div className='px-4 pt-4'>
          <Skeleton className='aspect-square w-full rounded-2xl' />
        </div>
      );
    }
    if (
      isRecError ||
      (recommendationsData?.recommendations.length ?? 0) === 0
    ) {
      return (
        <div className='px-4 pt-4'>
          <div className='border-border bg-muted rounded-2xl border border-dashed p-6 text-center'>
            <p className='text-muted-foreground mb-4 text-[12px]'>
              {isRecError ? t('no_recommendations') : t('no_practitioners')}
            </p>
            <Button variant='outline' onClick={openDrawer}>
              {t('find_another_cta')}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className='overflow-x-hidden px-0 pt-4'>
        <RecommendationCardStack
          key={JSON.stringify(savedResult)}
          recommendations={recommendationsData?.recommendations ?? []}
          onBook={handleBook}
          trailingCard={<RecommendationRefreshCard onStart={openDrawer} />}
        />
      </div>
    );
  };

  /** Renders records list, loading, or empty states. */
  const renderRecordsContent = () => {
    if (isAuthLoading || isRecordsLoading) {
      return (
        <div className='space-y-3'>
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        </div>
      );
    }
    if (error) {
      return (
        <div className='bg-danger-tint rounded-lg p-4 text-center'>
          <p className='text-danger text-[12px]'>{t('failed_records')}</p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='text-danger mt-2 text-[12px] underline'
          >
            {t('tap_retry')}
          </button>
        </div>
      );
    }
    if (records.length > 0) {
      return (
        <div className='flex flex-col'>
          {records.slice(0, 5).map((record: IRecord) => (
            <RecordCard
              key={record.id.split('/')[1]}
              record={record}
              titlesLoading={titlesLoading}
            />
          ))}
        </div>
      );
    }
    return (
      <div className='bg-muted text-muted-foreground rounded-lg p-4 text-center text-[12px]'>
        {t('no_records')}
      </div>
    );
  };

  return (
    <>
      {/* PRIMARY: Live Recommendation Cards */}
      {renderRecommendations()}

      {/* UNIFIED SCREENING DRAWER */}
      <ScreeningDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onComplete={handleComplete}
      />

      {/* SECONDARY: Quick Actions */}
      <div className='px-4 py-4'>
        <ActionCard
          icon={<Building2 className='text-muted-foreground h-5 w-5' />}
          title={t('show_clinics')}
          description={t('find_practitioners')}
          href='/clinic'
        />
      </div>

      {/* BELOW FOLD: Previous Records */}
      <div className='p-4'>
        <div className='text-muted-foreground flex justify-between'>
          <span className='mb-2 text-[14px] font-bold'>
            {t('previous_records')}
          </span>
          <Link className='text-[12px]' href='/record'>
            {tCommon('see_all')}
          </Link>
        </div>

        {renderRecordsContent()}
      </div>
    </>
  );
}
