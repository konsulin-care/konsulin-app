'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { Sparkles } from 'lucide-react';

interface RecommendationRefreshCardProps {
  /** Fired when the user wants to restart the recommendation flow. */
  onStart: () => void;
}

/**
 * Trailing card in the recommendation stack that invites a fresh run.
 *
 * Mirrors the square shape of RecommendationCard so it aligns with the
 * practitioner slides.
 *
 * @param props.onStart - Fired when the start-again button is pressed
 */
export default function RecommendationRefreshCard({
  onStart
}: Readonly<RecommendationRefreshCardProps>) {
  const t = useTranslations('home');

  return (
    <div className='border-border bg-muted flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center'>
      <Sparkles className='text-turquoise-deep h-8 w-8' />
      <p className='text-foreground text-base font-bold'>
        {t('find_another_title')}
      </p>
      <p className='text-muted-foreground text-xs'>{t('find_another_hint')}</p>
      <Button type='button' variant='outline' onClick={onStart}>
        {t('find_another_cta')}
      </Button>
    </div>
  );
}
