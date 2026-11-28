'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import Link from 'next/link';

/** Props of the manage-page edit card. */
export interface EditCardProps {
  /** Public id of the study to edit. */
  studyId: string;
}

/**
 * Edit card of the manage page: explains what can be edited and links to the
 * title step of the edit form. Renders a single charcoal action.
 *
 * @param props - Public id of the study to edit.
 * @returns The edit card element.
 */
export default function EditCard({ studyId }: Readonly<EditCardProps>) {
  const t = useTranslations('research');

  return (
    <section
      data-testid='edit-card'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('manage.edit_heading')}
      </h2>
      <p className='text-muted-foreground text-sm'>{t('manage.edit_body')}</p>
      <Button asChild variant='default' className='min-h-11 w-full'>
        <Link href={`/research/edit?id=${studyId}&page=title`}>
          {t('manage.edit_action')}
        </Link>
      </Button>
    </section>
  );
}
