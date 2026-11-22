import { useTranslations } from '@/i18n';
import Link from 'next/link';

/**
 * Confirmation shown after a submission was saved to the offline queue
 * instead of being sent to the server. Links back to the home page so the
 * user can continue without resubmitting the form.
 *
 * @returns The offline queued confirmation notice.
 */
function OfflineQueuedNotice() {
  const t = useTranslations('common');

  return (
    <section
      data-testid='offline-queued-notice'
      className='mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center'
    >
      <h2 className='text-2xl font-bold'>{t('pwa.queued_title')}</h2>
      <p className='text-muted-foreground text-sm'>
        {t('pwa.queued_description')}
      </p>
      <Link
        href='/'
        className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium'
      >
        {t('pwa.queued_back_home')}
      </Link>
    </section>
  );
}

export default OfflineQueuedNotice;
