'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import { formatBatchDate } from '@/utils/format-batch-date';
import Link from 'next/link';

/** Studies shown per shelf before the browse-all link. */
const SHELF_LIMIT = 3;

/** Props of the participant home open-to-join shelves. */
export interface OpenToJoinProps {
  /** Active catalogue studies, in catalogue order. */
  studies: readonly StudyProgress[];
  /** Ids of studies the participant has already joined. */
  joinedIds: readonly string[];
  /** Configured Konsulin organization id, when known. */
  konsulinOrganizationId?: string;
  /** Questionnaire metadata used for the minutes line, when known. */
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
  /** True while the catalogue is loading. */
  isLoading?: boolean;
  /** True when the catalogue failed to load. */
  isError?: boolean;
}

/** Studies split into the two open-to-join shelves. */
interface Shelves {
  konsulin: StudyProgress[];
  others: StudyProgress[];
  total: number;
}

/**
 * Splits unjoined studies into the Konsulin and other-group shelves,
 * keeping catalogue order and capping each shelf.
 *
 * @param studies - Active catalogue studies, in catalogue order.
 * @param joinedIds - Ids of studies the participant has already joined.
 * @param konsulinOrganizationId - Configured Konsulin organization id.
 * @returns Capped shelves plus the total unjoined count.
 */
function splitShelves(
  studies: readonly StudyProgress[],
  joinedIds: readonly string[],
  konsulinOrganizationId: string
): Shelves {
  const joined = new Set(joinedIds);
  const unjoined = studies.filter(study => !joined.has(study.study.id ?? ''));
  const konsulin: StudyProgress[] = [];
  const others: StudyProgress[] = [];
  for (const study of unjoined) {
    const profile = readStudyProfile(study.study, konsulinOrganizationId);
    const shelf = profile.isKonsulin ? konsulin : others;
    if (shelf.length < SHELF_LIMIT) shelf.push(study);
  }
  return { konsulin, others, total: unjoined.length };
}

/**
 * Sums the known questionnaire durations of the study's current batch.
 *
 * @param progress - Study progress.
 * @param titleMap - Questionnaire metadata, when known.
 * @returns Total minutes, or null when no duration is known.
 */
function minutesOf(
  progress: StudyProgress,
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>
): number | null {
  if (!titleMap) return null;
  let total = 0;
  let known = 0;
  for (const id of progress.currentBatch?.questionnaireIds ?? []) {
    const minutes = titleMap.get(id)?.durationMinutes;
    if (typeof minutes !== 'number') continue;
    total += minutes;
    known += 1;
  }
  return known === 0 ? null : total;
}

/**
 * Current batch line of an open-to-join card.
 *
 * @param props - Study progress.
 * @returns The batch line, or null without an open batch.
 */
function BatchLine({ progress }: Readonly<{ progress: StudyProgress }>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const batch = progress.currentBatch;
  if (!batch) return null;
  return (
    <p
      data-testid='open-to-join-batch'
      className='text-muted-foreground text-xs'
    >
      {t('batch_line.current', {
        index: progress.batches.indexOf(batch) + 1,
        total: progress.batches.length,
        date: formatBatchDate(batch.end, locale)
      })}
    </p>
  );
}

/**
 * Group and lead line of an open-to-join card.
 *
 * @param props - Study progress and configured Konsulin organization id.
 * @returns The group and lead line.
 */
function GroupLead({
  progress,
  konsulinOrganizationId
}: Readonly<{
  progress: StudyProgress;
  konsulinOrganizationId: string;
}>) {
  const t = useTranslations('research');
  const profile = readStudyProfile(progress.study, konsulinOrganizationId);
  const group = profile.groupName ?? t('side_facts.run_by_fallback');
  const line = profile.leadName
    ? t('overview.kicker', { group, name: profile.leadName })
    : group;
  return <p className='text-muted-foreground text-xs'>{line}</p>;
}

/**
 * One open-to-join study card: title, group and lead, batch line, minutes
 * and the link into the study page.
 *
 * @param props - Study progress, organization id and questionnaire metadata.
 * @returns The card element.
 */
function StudyCard({
  progress,
  konsulinOrganizationId,
  titleMap
}: Readonly<{
  progress: StudyProgress;
  konsulinOrganizationId: string;
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
}>) {
  const t = useTranslations('research');
  const minutes = minutesOf(progress, titleMap);
  return (
    <article
      data-testid='open-to-join-card'
      className='border-border bg-card flex flex-col gap-2 rounded-lg border p-4'
    >
      <h3 className='text-foreground text-base font-bold'>
        {progress.study.title ?? ''}
      </h3>
      <GroupLead
        progress={progress}
        konsulinOrganizationId={konsulinOrganizationId}
      />
      <BatchLine progress={progress} />
      {minutes === null ? null : (
        <p className='text-charcoal-700 text-xs'>
          {t('overview.time_value', { minutes })}
        </p>
      )}
      <Button variant='action' asChild className='min-h-11 w-fit rounded-lg'>
        <Link href={`/study?id=${progress.study.id ?? ''}`}>
          {t('open_to_join.view_study')}
        </Link>
      </Button>
    </article>
  );
}

/**
 * One open-to-join shelf: heading plus its card grid.
 *
 * @param props - Heading key, studies, organization id and metadata.
 * @returns The shelf element, or null when it has no studies.
 */
function Shelf({
  headingKey,
  studies,
  konsulinOrganizationId,
  titleMap
}: Readonly<{
  headingKey: 'open_to_join.konsulin_heading' | 'open_to_join.others_heading';
  studies: readonly StudyProgress[];
  konsulinOrganizationId: string;
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
}>) {
  const t = useTranslations('research');
  if (studies.length === 0) return null;
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-foreground text-base font-bold'>{t(headingKey)}</h2>
      <ul className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6'>
        {studies.map(study => (
          <li key={study.study.id}>
            <StudyCard
              progress={study}
              konsulinOrganizationId={konsulinOrganizationId}
              titleMap={titleMap}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Loading placeholder of the open-to-join shelves.
 *
 * @returns Skeleton shelf blocks.
 */
function ShelvesLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='open-to-join-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-5 w-40 rounded-lg' />
      <Skeleton className='h-32 w-full rounded-lg' />
    </output>
  );
}

/**
 * Participant home open-to-join shelves: up to three Konsulin studies and up
 * to three studies from other research groups, drawn from the unjoined
 * catalogue in catalogue order, plus a link to every study. Empty shelves
 * are hidden.
 *
 * @param props - Catalogue studies, joined ids, organization id and states.
 * @returns The shelves element, or null when nothing is open to join.
 */
export default function OpenToJoin({
  studies,
  joinedIds,
  konsulinOrganizationId = '',
  titleMap,
  isLoading = false,
  isError = false
}: Readonly<OpenToJoinProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');

  if (isLoading) return <ShelvesLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='open-to-join-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }

  const { konsulin, others, total } = splitShelves(
    studies,
    joinedIds,
    konsulinOrganizationId
  );
  if (total === 0) return null;

  return (
    <div data-testid='open-to-join' className='flex flex-col gap-6'>
      <Shelf
        headingKey='open_to_join.konsulin_heading'
        studies={konsulin}
        konsulinOrganizationId={konsulinOrganizationId}
        titleMap={titleMap}
      />
      <Shelf
        headingKey='open_to_join.others_heading'
        studies={others}
        konsulinOrganizationId={konsulinOrganizationId}
        titleMap={titleMap}
      />
      <Button variant='link' asChild className='min-h-11 self-start'>
        <Link href='/studies'>
          {t('open_to_join.browse_all', { count: total })}
        </Link>
      </Button>
    </div>
  );
}
