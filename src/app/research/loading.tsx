import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level loading fallback for /research. Covers the blank-screen gap
 * during client navigation while the research chunk (including swiper)
 * loads. Server component: no hooks, no interactivity.
 *
 * @returns Skeleton blocks matching the page's main sections.
 */
export default function Loading() {
  return (
    <div
      data-testid='research-route-loading'
      role='status'
      aria-busy='true'
      aria-label='Loading research'
      className='flex flex-col gap-4 px-4 pt-4'
    >
      {/* Header bar placeholder. */}
      <Skeleton className='h-12 w-full rounded-xl' />
      {/* Carousel block placeholder. */}
      <Skeleton className='h-72 w-full rounded-xl' />
      {/* Dashboard block placeholder. */}
      <Skeleton className='h-44 w-full rounded-xl' />
    </div>
  );
}
