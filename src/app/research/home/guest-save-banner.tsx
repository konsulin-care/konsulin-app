'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { isAfter, subHours } from 'date-fns';
import Link from 'next/link';

/** Hours the backend keeps a guest id, so the response can still be claimed. */
const GUEST_ID_WINDOW_HOURS = 24;

/** Props of the guest save banner on the participant home. */
export interface GuestSaveBannerProps {
  /** ISO timestamp of the guest's most recent authored response. */
  authored?: string | null;
  /** Id of the study that response belongs to. */
  studyId?: string | null;
  /** True when the viewer is a signed-in patient, who needs no saving. */
  isPatient?: boolean;
  /** Overrides the current time, for deterministic rendering. */
  now?: Date;
}

/**
 * Tells whether an authored timestamp falls inside the guest id window.
 *
 * @param authored - ISO timestamp of the response.
 * @param now - Current time.
 * @returns True when the response is less than 24 hours old.
 */
function isWithinWindow(authored: string, now: Date): boolean {
  const date = new Date(authored);
  if (Number.isNaN(date.getTime())) return false;
  return isAfter(date, subHours(now, GUEST_ID_WINDOW_HOURS));
}

/**
 * Quiet guest banner: the report behind a recent guest response can still be
 * saved, with a button link to that study's report.
 *
 * @param props - Authored timestamp, study id, role flag and clock override.
 * @returns The banner element, or null when it does not apply.
 */
export default function GuestSaveBanner({
  authored = null,
  studyId = null,
  isPatient = false,
  now = new Date()
}: Readonly<GuestSaveBannerProps>) {
  const t = useTranslations('research');

  if (isPatient || !authored || !studyId) return null;
  if (!isWithinWindow(authored, now)) return null;

  return (
    <aside
      data-testid='guest-save-banner'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <p className='text-charcoal-700 text-sm leading-relaxed'>
        {t('guest_save.body')}
      </p>
      <Button variant='secondary' asChild className='min-h-11 w-fit rounded-lg'>
        <Link href={`/report?id=${studyId}`}>{t('guest_save.cta')}</Link>
      </Button>
    </aside>
  );
}
