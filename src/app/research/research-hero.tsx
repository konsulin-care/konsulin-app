'use client';

import type { StudyProgress } from '@/utils/fhir/research';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/** Whole days until a batch closes, never negative. */
function daysUntil(end: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(end), new Date()));
}

/** Hero card for a single concurrent research study. */
function StudyCard({ progress }: Readonly<{ progress: StudyProgress }>) {
  const { study, currentBatch } = progress;
  const completedPercent =
    progress.totalCount === 0
      ? 0
      : (progress.completedCount / progress.totalCount) * 100;

  const ctaHref = progress.firstUncompletedQuestionnaireId
    ? `/assessments?id=${progress.firstUncompletedQuestionnaireId}`
    : '/research';

  return (
    <article className='card flex flex-col gap-2 border-0 bg-white p-4'>
      <div className='flex items-start gap-2'>
        <FlaskConical className='mt-0.5 h-5 w-5 shrink-0 text-black' />
        <div className='flex min-w-0 flex-col'>
          <h3 className='text-sm font-bold text-black'>{study.title}</h3>
          <p className='text-[11px] leading-4 text-gray-500'>
            {study.description}
          </p>
        </div>
      </div>

      {currentBatch && (
        <div className='flex flex-col gap-1 text-[11px] text-gray-600'>
          <div className='flex items-center justify-between'>
            <span className='font-bold text-black'>
              Batch {progress.batches.indexOf(currentBatch) + 1}
            </span>
            <span>Closes in {daysUntil(currentBatch.end)} days</span>
          </div>
          <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-200'>
            <div
              className='h-full rounded-full bg-[#13c2c2]'
              style={{ width: `${completedPercent}%` }}
            />
          </div>
          <div className='flex items-center justify-between'>
            <span>
              {progress.completedCount}/{progress.totalCount} questionnaires
            </span>
            {progress.isComplete && (
              <span className='font-bold text-green-600'>Batch complete</span>
            )}
          </div>
        </div>
      )}

      {progress.isComplete ? (
        <div className='rounded-xl bg-green-50 px-4 py-2 text-center text-xs font-bold text-green-700'>
          You've completed this batch. Next batch opens soon!
        </div>
      ) : (
        <Link
          href={ctaHref}
          className='bg-secondary rounded-[32px] px-4 py-2 text-center text-sm font-bold text-white'
        >
          Participate
        </Link>
      )}
    </article>
  );
}

/** Concurrent active study cards in the research hero section. */
export default function ResearchHero({
  studies
}: Readonly<{ studies: StudyProgress[] }>) {
  return (
    <section className='mt-2'>
      <h2 className='mb-2 text-sm font-bold text-gray-700'>Ongoing Research</h2>
      <div className='flex flex-col gap-3'>
        {studies.map(progress => (
          <StudyCard key={progress.study.id} progress={progress} />
        ))}
      </div>
    </section>
  );
}
