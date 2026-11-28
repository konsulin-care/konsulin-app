'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { useState } from 'react';

/**
 * Export card of the manage page: a single charcoal button that reveals an
 * inline coming-soon banner. The banner has no dismiss control, so the card
 * keeps exactly one button.
 *
 * @returns The export card element.
 */
export default function ExportCard() {
  const t = useTranslations('research');
  const [showBanner, setShowBanner] = useState(false);

  return (
    <section
      data-testid='export-card'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('manage.export_heading')}
      </h2>
      <p className='text-muted-foreground text-sm'>{t('manage.export_body')}</p>
      <Button
        type='button'
        variant='default'
        className='min-h-11 w-full'
        onClick={() => {
          setShowBanner(true);
        }}
      >
        {t('manage.export_action')}
      </Button>
      {showBanner ? (
        <Alert role='status'>
          <AlertDescription>{t('manage.export_coming_soon')}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
