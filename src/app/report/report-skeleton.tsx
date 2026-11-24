'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for the research report.
 *
 * Mirrors the report's main blocks (headline, result block, trail) inside the
 * same card container as the loaded page so the layout does not jump when the
 * data resolves.
 *
 * @returns The skeleton card shown while the report data loads.
 */
export function ReportSkeleton() {
  return (
    <div
      data-testid='report-skeleton'
      aria-busy='true'
      className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'
    >
      <div className='mb-4 space-y-3'>
        <Skeleton className='h-6 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
        <Skeleton className='h-2 w-full' />
      </div>

      <div className='border-border mb-4 space-y-3 rounded-xl border p-4'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-2 w-full' />
        <Skeleton className='h-2 w-5/6' />
        <Skeleton className='h-2 w-4/6' />
      </div>

      <div className='mb-4 space-y-2'>
        <Skeleton className='h-3 w-full' />
        <Skeleton className='h-3 w-2/3' />
      </div>
    </div>
  );
}
