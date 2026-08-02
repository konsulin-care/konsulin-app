'use client';

import { useResearchProgress } from '@/services/api/research';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/**
 * Header widget in the appointment-card dimension showing the user's
 * research participation: current batch progress and level.
 *
 * Renders nothing while loading, when no active study exists, or when the
 * user has no current batch. Consumers (PageHeader) gate it to patients and
 * guests only.
 */
export default function ResearchHeaderWidget() {
  const { data: progress, isLoading } = useResearchProgress();

  if (isLoading || !progress || progress.studies.length === 0) return null;

  const primary = progress.studies[0];
  const batch = primary.currentBatch;
  if (!batch) return null;

  const batchIndex = primary.batches.indexOf(batch) + 1;
  const levelLabel = progress.currentLevel?.label ?? 'New';
  const percent =
    primary.totalCount === 0
      ? 0
      : (primary.completedCount / primary.totalCount) * 100;

  return (
    <Link
      href='/research'
      data-testid='research-header-widget'
      className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-3'
    >
      <div className='flex items-center'>
        <FlaskConical className='mr-[10px] h-5 w-5 shrink-0 text-black' />
        <div className='mr-auto flex flex-col'>
          <span className='text-muted text-[12px]'>Active Research</span>
          <span className='text-secondary text-left text-[14px] font-bold'>
            Batch {batchIndex} · {primary.completedCount}/{primary.totalCount}{' '}
            questionnaires
          </span>
        </div>
        <span className='bg-secondary rounded-full px-2 py-0.5 text-[10px] font-bold text-white'>
          {levelLabel}
        </span>
      </div>
      <div className='mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200'>
        <div
          className='h-full rounded-full bg-[#13c2c2]'
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
}
