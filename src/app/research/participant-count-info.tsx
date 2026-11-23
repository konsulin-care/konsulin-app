import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useTranslations } from '@/i18n';
import { Info } from 'lucide-react';

/**
 * Info trigger with the cached-count disclaimer tooltip.
 *
 * Explains that the displayed participant count is cached and refreshed
 * periodically, so the number may lag behind the live total.
 *
 * @returns The tooltip-wrapped info button.
 */
export function ParticipantCountInfo() {
  const t = useTranslations('research');

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label={t('batch_progress.about_count')}
            className='text-muted-foreground hover:text-charcoal-700 cursor-pointer'
          >
            <Info className='h-3 w-3' />
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('batch_progress.cached_disclaimer')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
