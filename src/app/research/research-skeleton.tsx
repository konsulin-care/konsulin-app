import { Skeleton } from '@/components/ui/skeleton';

/**
 * Pulsating placeholder mirroring the /research layout so content swaps in
 * without layout shift while the research progress query loads.
 *
 * @returns A skeleton for the referral notice, carousel card, and dashboard.
 */
export default function ResearchSkeleton() {
  return (
    <div
      data-testid='research-skeleton'
      role='status'
      aria-busy='true'
      aria-label='Loading ongoing research'
      className='flex flex-col gap-4'
    >
      {/* Referral notice placeholder. */}
      <Skeleton className='h-12 w-full rounded-xl' />
      {/* Carousel card placeholder. */}
      <div className='card flex flex-col gap-3 bg-white p-4'>
        <div className='flex items-start gap-2'>
          <Skeleton className='mt-0.5 h-5 w-5 rounded-full' />
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-2/3 max-w-56' />
            <Skeleton className='h-3 w-full max-w-80' />
          </div>
        </div>
        <div className='flex flex-col gap-1.5'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-3 w-24' />
          </div>
          <Skeleton className='h-1.5 w-full rounded-full' />
        </div>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <Skeleton className='h-8 w-8 rounded-full' />
          <Skeleton className='h-8 w-8 rounded-full' />
        </div>
        <div className='flex flex-col gap-2.5'>
          <Skeleton className='h-3.5 w-24' />
          <Skeleton className='h-3.5 w-32' />
          <Skeleton className='h-3.5 w-20' />
        </div>
        <Skeleton className='h-4 w-36' />
      </div>
      {/* Contribution dashboard placeholder. */}
      <div className='card flex items-center gap-4 bg-[#F9F9F9] p-4'>
        <Skeleton className='h-[72px] w-[72px] shrink-0 rounded-full' />
        <div className='flex flex-1 flex-col gap-2'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-3 w-44' />
          <Skeleton className='h-3 w-40' />
        </div>
      </div>
    </div>
  );
}
