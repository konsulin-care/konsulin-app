'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { writeClipboard } from '@/utils/clipboard';
import { useEffect, useState } from 'react';

/** Props of the manage-page share card. */
export interface ShareCardProps {
  /** Public id of the study the link points at. */
  studyId: string;
  /** Renders the copy button as the turquoise action variant. */
  primary?: boolean;
}

/** Copy feedback state shown under the link. */
type CopyState = 'idle' | 'copied' | 'failed';

/** Message key carrying the feedback label of each copy state. */
const FEEDBACK_KEY: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'manage.link_copied',
  failed: 'manage.copy_failed'
};

/**
 * Share card for the manage page: shows the absolute study link and a button
 * that copies it to the clipboard, reporting success or failure inline.
 *
 * @param props - Study id and whether the button is the primary action.
 * @returns The share card element.
 */
export default function ShareCard({
  studyId,
  primary = false
}: Readonly<ShareCardProps>) {
  const t = useTranslations('research');
  const [origin, setOrigin] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/study?id=${studyId}` : '';
  const displayUrl = url.replace(/^https?:\/\//, '');

  const handleCopy = async (): Promise<void> => {
    try {
      await writeClipboard(url);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <section
      data-testid='share-card'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('manage.share_heading')}
      </h2>
      <a
        data-testid='share-link'
        href={url}
        target='_blank'
        rel='noopener'
        className='text-turquoise-deep truncate text-sm underline-offset-4 hover:underline'
      >
        {displayUrl}
      </a>
      <Button
        type='button'
        variant={primary ? 'action' : 'default'}
        className='min-h-11 w-full'
        onClick={() => {
          void handleCopy();
        }}
      >
        {t('manage.copy_link')}
      </Button>
      {copyState === 'idle' ? null : (
        <p
          role={copyState === 'copied' ? 'status' : 'alert'}
          className={
            copyState === 'copied'
              ? 'text-muted-foreground text-sm'
              : 'text-destructive text-sm'
          }
        >
          {t(FEEDBACK_KEY[copyState])}
        </p>
      )}
    </section>
  );
}
