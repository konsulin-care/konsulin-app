import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';

/**
 * Route-level loading fallback for /research. Covers the blank-screen gap
 * during client navigation while the research chunk (including swiper)
 * loads. Server component: no hooks, no interactivity.
 *
 * @returns Skeleton blocks matching the page's main sections.
 */
export default function Loading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='research-route-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-4 px-4 pt-4'
    >
      {/* Header bar placeholder. */}
      <Skeleton className='h-12 w-full rounded-xl' />
      {/* Carousel block placeholder. */}
      <Skeleton className='h-72 w-full rounded-xl' />
      {/* Dashboard block placeholder. */}
      <Skeleton className='h-44 w-full rounded-xl' />
    </output>
  );
}
