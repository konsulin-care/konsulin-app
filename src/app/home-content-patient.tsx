'use client';

import ActionCard from '@/components/general/action-card';
import { ComplaintSearch } from '@/components/general/home/interview/complaint-search';
import { InterviewFlow } from '@/components/general/home/interview/interview-flow';
import RecommendationCardStack from '@/components/general/home/recommendation-card-stack';
import RecordCard from '@/components/shared/record-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { useRecommendations } from '@/services/recommendations';
import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';
import type { IRecord } from '@/types/record';
import {
  buildRecommendationParams,
  readLastInterviewResult,
  saveLastInterviewResult
} from '@/utils/recommendation-interview';
import { Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Top-level container for the patient-home interview drawer. */
function InterviewLaunch({
  onSelect
}: Readonly<{ onSelect: (complaint: ChiefComplaint) => void }>) {
  return (
    <div className='fixed inset-x-0 bottom-0 z-40 flex justify-center'>
      <div className='w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-lg'>
        <p className='mb-1 text-[12px] font-semibold text-[var(--secondary)]'>
          Smart Assessment
        </p>
        <h2 className='mb-4 text-[16px] font-bold text-gray-900'>
          What&apos;s bringing you in today?
        </h2>
        <ComplaintSearch onSelect={onSelect} />
      </div>
    </div>
  );
}

/** Diamonds empty-state prompting the patient to start the interview. */
function EmptyRecommendationState({
  onStart
}: Readonly<{ onStart: () => void }>) {
  return (
    <div className='px-4 pt-4'>
      <div className='rounded-2xl border border-dashed border-gray-300 bg-[#F9F9F9] p-6 text-center'>
        <Sparkles
          className='mx-auto mb-3 h-6 w-6 text-[var(--secondary)]'
          aria-hidden='true'
        />
        <p className='mb-1 text-[14px] font-bold text-gray-800'>
          Get matched to the right care
        </p>
        <p className='mb-4 text-[12px] text-gray-500'>
          Answer a few quick questions and we&apos;ll recommend practitioners
          for your concern.
        </p>
        <Button
          variant='default'
          onClick={onStart}
          className='bg-[var(--secondary)] text-white'
        >
          Start Assessment
        </Button>
      </div>
    </div>
  );
}

/** Patient home page with live recommendations, clinic link, and records. */
export default function HomeContentPatient() {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const patientId = authState?.userInfo?.fhirId;

  const [savedResult, setSavedResult] = useState<InterviewResult | null>(() =>
    readLastInterviewResult()
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<ChiefComplaint | null>(null);

  const {
    data: recommendationsData,
    isLoading: isRecLoading,
    isError: isRecError
  } = useRecommendations(
    savedResult ? buildRecommendationParams(savedResult) : null
  );

  const {
    records,
    isLoading: isRecordsLoading,
    titlesLoading,
    error
  } = usePatientRecords(patientId);

  /** Navigate to the practitioner booking page. */
  const handleBook = (practitionerId: string) => {
    router.push(`/appointment?practitioner=${practitionerId}`);
  };

  /** Persist the interview result and render live recommendations. */
  const handleInterviewComplete = (result: InterviewResult) => {
    saveLastInterviewResult(result);
    setSavedResult(result);
    setDrawerOpen(false);
    setSelectedComplaint(null);
  };

  /** Renders the live recommendation stack, loading, or empty variants. */
  const renderRecommendations = () => {
    if (!savedResult) {
      return <EmptyRecommendationState onStart={() => setDrawerOpen(true)} />;
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
          <div className='rounded-2xl border border-dashed border-gray-300 bg-[#F9F9F9] p-6 text-center'>
            <p className='text-[12px] text-gray-500'>
              {isRecError
                ? 'Could not load recommendations right now.'
                : 'No practitioners found for this concern yet.'}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className='overflow-x-hidden px-0 pt-4'>
        <RecommendationCardStack
          recommendations={recommendationsData?.recommendations ?? []}
          onBook={handleBook}
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
        <div className='rounded-lg bg-red-50 p-4 text-center'>
          <p className='text-[12px] text-red-600'>Failed to load records.</p>
          <button
            onClick={() => window.location.reload()}
            className='mt-2 text-[12px] text-red-700 underline'
          >
            Tap to retry
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
      <div className='rounded-lg bg-[#F9F9F9] p-4 text-center text-[12px] text-gray-500'>
        No records yet. Complete an assessment to see it here.
      </div>
    );
  };

  return (
    <>
      {/* PRIMARY: Live Recommendation Cards */}
      {renderRecommendations()}

      {/* INTERVIEW DRAWER */}
      {drawerOpen && (
        <>
          <div
            className='fixed inset-0 z-40 bg-black/40'
            onClick={() => setDrawerOpen(false)}
            aria-hidden='true'
          />
          {selectedComplaint ? (
            <InterviewFlow
              open
              complaint={selectedComplaint}
              onComplete={handleInterviewComplete}
              onClose={() => {
                setDrawerOpen(false);
                setSelectedComplaint(null);
              }}
            />
          ) : (
            <InterviewLaunch
              onSelect={complaint => setSelectedComplaint(complaint)}
            />
          )}
        </>
      )}

      {/* SECONDARY: Quick Actions */}
      <div className='px-4 pb-4'>
        <ActionCard
          icon={<Building2 className='h-5 w-5 text-gray-600' />}
          title='Show All Clinics'
          description='Find practitioners near you'
          href='/clinic'
        />
      </div>

      {/* BELOW FOLD: Previous Records */}
      <div className='p-4'>
        <div className='text-muted flex justify-between'>
          <span className='mb-2 text-[14px] font-bold'>Previous Records</span>
          <Link className='text-[12px]' href='/record'>
            See All
          </Link>
        </div>

        {renderRecordsContent()}
      </div>
    </>
  );
}
