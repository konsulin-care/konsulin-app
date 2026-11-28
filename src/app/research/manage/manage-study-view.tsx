'use client';

import { StudyStatusChip } from '@/app/research/researcher/study-status-chip';
import { useTranslations } from '@/i18n';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { researcherStudyStatus } from '@/utils/fhir/researcher-study-status';
import { localDateOf } from '@/utils/local-date';
import Link from 'next/link';
import EditCard from './edit-card';
import ExportCard from './export-card';
import FindingsCard from './findings-card';
import OverviewCard from './overview-card';
import ShareCard from './share-card';

/** Props of the manage-study view. */
export interface ManageStudyViewProps {
  /** Study with its batches and computed metadata. */
  study: ResearchStudyWithBatches;
  /** Reference date, yyyy-mm-dd. Defaults to the local date today. */
  today?: string;
}

/** Grid slot classes that place a card in the main column. */
const MAIN_SLOT = 'min-w-0 lg:col-span-2 lg:col-start-1';

/** Grid slot classes for the side column cards. */
const SIDE_SLOT = 'min-w-0 lg:col-start-3';

/**
 * Header of the manage page: back link to the researcher home, sponsor, study
 * title and status chip.
 *
 * @param props - Study and its derived status.
 * @returns The header element.
 */
function ManageHeader({
  study,
  status
}: Readonly<{
  study: ResearchStudyWithBatches;
  status: ReturnType<typeof researcherStudyStatus>;
}>) {
  const t = useTranslations('research');

  return (
    <header className='flex flex-col gap-2'>
      <Link
        href='/'
        className='text-turquoise-deep w-fit text-sm font-medium underline-offset-4 hover:underline'
      >
        {t('manage.back')}
      </Link>
      <p className='text-muted-foreground text-xs'>
        {study.study.sponsor?.display ?? t('side_facts.run_by_fallback')}
      </p>
      <h1 className='text-foreground text-2xl font-bold'>
        {study.study.title ?? ''}
      </h1>
      <StudyStatusChip status={status} />
    </header>
  );
}

/**
 * Manage page for one researcher study: header with status, read-only overview,
 * findings composer, and the share, edit and export actions.
 *
 * The turquoise action card is rendered directly after the overview in DOM
 * order, so it also appears directly below it on phones.
 *
 * @param props - Study and optional reference date.
 * @returns The manage-study view.
 */
export default function ManageStudyView({
  study,
  today
}: Readonly<ManageStudyViewProps>) {
  const reference = today ?? localDateOf(new Date().toISOString());
  const status = researcherStudyStatus(study.study, study.batches, reference);
  const findingPrimary = status.kind === 'finding-due';
  const studyId = study.study.id ?? '';

  return (
    <div className='flex flex-col gap-6'>
      <ManageHeader study={study} status={status} />
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className={`${MAIN_SLOT} lg:row-start-1`}>
          <OverviewCard study={study} today={reference} />
        </div>
        {findingPrimary ? (
          <div className={`${MAIN_SLOT} lg:row-start-2`}>
            <FindingsCard study={study.study} primary />
          </div>
        ) : (
          <div className={`${SIDE_SLOT} lg:row-start-1`}>
            <ShareCard studyId={studyId} primary />
          </div>
        )}
        {findingPrimary ? (
          <div className={`${SIDE_SLOT} lg:row-start-1`}>
            <ShareCard studyId={studyId} />
          </div>
        ) : (
          <div className={`${MAIN_SLOT} lg:row-start-2`}>
            <FindingsCard study={study.study} />
          </div>
        )}
        <div className={`${SIDE_SLOT} lg:row-start-2`}>
          <EditCard studyId={studyId} />
        </div>
        <div className={`${SIDE_SLOT} lg:row-start-3`}>
          <ExportCard />
        </div>
      </div>
    </div>
  );
}
