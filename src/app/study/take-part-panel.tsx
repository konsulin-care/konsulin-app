import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import Link from 'next/link';

export interface TakePartPanelProps {
  studyId: string;
  isJoined: boolean;
  batchComplete?: boolean;
  isRepeated?: boolean;
  minutes?: number;
  onTakePart: () => void;
  onContinue?: () => void;
}

/**
 * Participant call to action for a study page.
 * @param props Viewer state, study id and handlers.
 * @returns The panel for the viewer's current state.
 */
export function TakePartPanel({
  studyId,
  isJoined,
  batchComplete,
  isRepeated,
  minutes,
  onTakePart,
  onContinue
}: TakePartPanelProps) {
  const t = useTranslations('research');

  if (!isJoined) {
    return (
      <div className='flex flex-col gap-2'>
        <Button className='min-h-11 rounded-lg' onClick={onTakePart}>
          {t('take_part.button')}
        </Button>
        <p className='text-muted-foreground text-sm'>{t('take_part.helper')}</p>
      </div>
    );
  }

  if (batchComplete) {
    return (
      <div className='flex flex-col gap-2'>
        <p className='font-medium'>{t('take_part.batch_done')}</p>
        <p className='text-muted-foreground text-sm'>
          {isRepeated
            ? t('take_part.after_repeated')
            : t('take_part.after_one_time')}
        </p>
        <Link
          href={`/report?id=${studyId}`}
          className='inline-flex min-h-11 items-center rounded-lg text-sm font-medium underline'
        >
          {t('take_part.see_report')}
        </Link>
      </div>
    );
  }

  return (
    <Button className='min-h-11 rounded-lg' onClick={onContinue}>
      {minutes ? t('take_part.continue', { minutes }) : t('take_part.start')}
    </Button>
  );
}
