'use client';

import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { FlaskConical } from 'lucide-react';
import { truncateDescription } from './study-sections';

export interface ResearcherStudySlideProps {
  study: ResearchStudyWithBatches;
  isActive: boolean;
  onClick: (studyId: string) => void;
  /** Per-study participant count, or undefined while loading. */
  participantCount?: number;
}

/** Researcher carousel slide card showing management-relevant study info. */
export default function ResearcherStudySlide({
  study,
  isActive,
  onClick,
  participantCount
}: Readonly<ResearcherStudySlideProps>) {
  const { study: studyResource, currentBatch, daysRemaining } = study;
  const batchCount = study.batches.length;
  const questionnaireCount = currentBatch?.questionnaireIds.length ?? 0;

  return (
    <div
      data-testid={`researcher-slide-${studyResource.id}`}
      className={`card border-softGray focus-within:ring-secondary relative flex h-full flex-col gap-2 bg-white p-4 transition-all duration-300 focus-within:ring-2 ${
        isActive ? 'opacity-100' : 'opacity-70'
      }`}
    >
      <button
        type='button'
        aria-label={`Open study ${studyResource.title}`}
        onClick={() => onClick(studyResource.id)}
        className='absolute inset-0 z-0 cursor-pointer'
      />
      <div className='pointer-events-none relative z-10 flex flex-col gap-2'>
        {/* Header: icon + title + status */}
        <div className='flex items-start gap-2'>
          <FlaskConical className='mt-0.5 h-5 w-5 shrink-0 text-black' />
          <div className='flex min-w-0 flex-col'>
            <h3 className='text-sm font-bold text-black'>
              {studyResource.title}
            </h3>
            <span className='mt-0.5 inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700'>
              {studyResource.status}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className='text-[11px] leading-4 text-gray-500'>
          {truncateDescription(studyResource.description)}
        </p>

        {/* Batch info */}
        <div className='flex items-center gap-1 text-[11px] text-gray-600'>
          <span>
            {batchCount} batch{batchCount === 1 ? '' : 'es'}
          </span>
          {currentBatch && (
            <>
              <span>&middot;</span>
              <span>
                Batch closes in {daysRemaining} day
                {daysRemaining === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className='flex items-center gap-3 text-[11px] text-gray-600'>
          <span>
            {participantCount === undefined ? '—' : participantCount}{' '}
            participant
            {participantCount === 1 ? '' : 's'}
          </span>
          <span>&middot;</span>
          <span>
            {questionnaireCount} questionnaire
            {questionnaireCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
