'use client';

import { useResearchProgress } from '@/services/api/research';
import { daysUntilBatch } from '@/utils/fhir/research';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/**
 * Header widget showing the user's research participation: the primary
 * study title, current batch indicator, closing deadline, and progress.
 *
 * The whole card links to the research page. Renders nothing while loading,
 * when no active study exists, or when the user has no current batch.
 * Consumers (PageHeader) gate it to patients and guests only.
 */
export default function ResearchHeaderWidget() {
  const { data: progress, isLoading } = useResearchProgress();

  if (isLoading || !progress || progress.studies.length === 0) return null;

  const primary = progress.studies[0];
  const batch = primary.currentBatch;
  if (!batch) return null;

  const batchIndex = primary.batches.indexOf(batch) + 1;
  const batchTotal = primary.batches.length;
  const percent =
    primary.totalCount === 0
      ? 0
      : (primary.completedCount / primary.totalCount) * 100;

  return (
    <Link
      href='/research'
      data-testid='research-header-widget'
      className='card mt-4 flex flex-col gap-1.5 border-0 bg-[#F9F9F9] p-3'
    >
      <div className='flex items-center'>
        <FlaskConical className='mr-[10px] h-5 w-5 shrink-0 text-black' />
        <span className='text-secondary truncate text-left text-[14px] font-bold'>
          {primary.study.title}
        </span>
      </div>
      <div className='flex items-center justify-between text-[11px] text-gray-600'>
        <span className='font-bold text-black'>
          Batch {batchIndex} of {batchTotal} · Closes in{' '}
          {daysUntilBatch(batch.end)} days
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <div className='h-1 flex-1 overflow-hidden rounded-full bg-gray-200'>
          <div
            className='h-full rounded-full bg-[#13c2c2]'
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className='text-[11px] font-bold text-gray-700'>
          {primary.completedCount}/{primary.totalCount} Questionnaires
        </span>
      </div>
      <p className='text-[10px] leading-4 text-gray-500'>
        Every questionnaire you complete counts toward the ongoing study
      </p>
    </Link>
  );
}
