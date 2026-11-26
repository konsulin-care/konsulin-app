'use client';

import { useTranslations } from '@/i18n';

export interface ConsentStudyProfile {
  readonly title: string;
  readonly groupName: string;
  readonly leadName: string;
  readonly batchCount: number;
}

interface ConsentDrawerContentProps {
  readonly profile?: ConsentStudyProfile;
}

/**
 * Informed consent copy of the consent drawer (body content only).
 * @param props.profile Optional study profile naming the study, group and lead.
 */
export default function ConsentDrawerContent({
  profile
}: ConsentDrawerContentProps) {
  const t = useTranslations('research');
  const batchKey =
    profile && profile.batchCount > 1
      ? 'consent_batches_repeated'
      : 'consent_batches_one_time';
  return (
    <div className='text-muted-foreground space-y-3 text-xs leading-5'>
      {profile ? (
        <p>
          {t('consent_who', {
            study: profile.title,
            group: profile.groupName,
            name: profile.leadName
          })}
        </p>
      ) : null}
      <p>{t('consent_intro')}</p>
      <p className='text-foreground font-bold'>{t('consent_by_heading')}</p>
      <ul className='list-disc space-y-1 pl-4'>
        <li>{t('consent_bullet_1')}</li>
        {profile ? <li>{t(batchKey, { count: profile.batchCount })}</li> : null}
      </ul>
      <p>{t('consent_referral')}</p>
      <p>{t('consent_rights')}</p>
    </div>
  );
}
