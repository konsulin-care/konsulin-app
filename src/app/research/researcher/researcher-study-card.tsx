'use client';

import { BatchSegments } from '@/app/research/researcher/batch-segments';
import ParticipantProgress from '@/app/research/researcher/participant-progress';
import { StudyStatusChip } from '@/app/research/researcher/study-status-chip';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { useStudyParticipantCount } from '@/services/api/research-counts';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { getResearchTarget } from '@/utils/fhir/research-target';
import { researcherStudyStatus } from '@/utils/fhir/researcher-study-status';
import { localDateOf } from '@/utils/local-date';
import type { ResearchStudy } from 'fhir/r4';
import Link from 'next/link';

/** Props of the researcher study card. */
export interface ResearcherStudyCardProps {
  /** Study with its batches and computed metadata. */
  study: ResearchStudyWithBatches;
  /** Reference date, yyyy-mm-dd. Defaults to the local date today. */
  today?: string;
  /**
   * Legacy post-finding callback, no longer called by the card.
   *
   * @deprecated Post findings from the manage page instead.
   */
  onPostFinding?: (study: ResearchStudy) => void;
}

/**
 * Researcher study card: sponsor, title, status chip, batch segments,
 * participant progress and one link to manage the study.
 *
 * @param props - Study and optional reference date.
 * @returns The researcher study card element.
 */
export default function ResearcherStudyCard({
  study,
  today
}: Readonly<ResearcherStudyCardProps>) {
  const t = useTranslations('research');
  const studyId = study.study.id ?? '';
  const target = getResearchTarget(study.study) ?? 0;
  const reference = today ?? localDateOf(new Date().toISOString());
  const status = researcherStudyStatus(study.study, study.batches, reference);
  const { data: participantCount, isLoading } = useStudyParticipantCount(
    study.study.id
  );

  return (
    <section
      data-testid='researcher-study-card'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <div className='flex flex-col gap-1'>
        <p className='text-muted-foreground text-xs'>
          {study.study.sponsor?.display ?? t('side_facts.run_by_fallback')}
        </p>
        <h3 className='text-foreground text-base font-bold'>
          {study.study.title ?? ''}
        </h3>
      </div>
      <StudyStatusChip status={status} />
      <BatchSegments batches={study.batches} today={reference} />
      <ParticipantProgress
        count={participantCount ?? 0}
        target={target}
        isLoading={isLoading}
      />
      <Button asChild variant='default' className='min-h-11 w-full'>
        <Link href={`/research/manage?id=${studyId}`}>
          {t('researcher_card.manage_study')}
        </Link>
      </Button>
    </section>
  );
}
