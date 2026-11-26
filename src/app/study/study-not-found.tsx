import EmptyState from '@/components/general/empty-state';
import { useTranslations } from '@/i18n';
import Link from 'next/link';

/**
 * Shown when a study is closed or the link is incomplete.
 * @returns message with a link to the open studies list
 */
export function StudyNotFound() {
  const t = useTranslations('research');
  return (
    <div className='flex flex-col items-center gap-4'>
      <EmptyState title={t('not_found.message')} subtitle='' />
      <Link
        href='/studies'
        className='text-primary flex min-h-11 items-center rounded-lg font-medium underline'
      >
        {t('not_found.link')}
      </Link>
    </div>
  );
}
