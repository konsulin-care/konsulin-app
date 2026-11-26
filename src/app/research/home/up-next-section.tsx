'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import type { UpNextItem } from '@/utils/fhir/research-queue';
import { formatBatchDate } from '@/utils/format-batch-date';
import Link from 'next/link';

/** Number of secondary queue rows rendered before the remainder count. */
const ROW_LIMIT = 3;

/** Props of the participant home up-next section. */
export interface UpNextSectionProps {
  /** Queue built by buildUpNextQueue, in display order. */
  items: readonly UpNextItem[];
  /** Resolved questionnaire metadata by questionnaire id. */
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  /** Number of studies the participant has joined. */
  joinedCount: number;
  /** Called with the lead study and questionnaire of the chosen item. */
  onStart: (study: StudyProgress, questionnaireId: string) => void;
  /** True while the underlying research data is loading. */
  isLoading?: boolean;
  /** True when the underlying research data failed to load. */
  isError?: boolean;
}

function groupNameOf(study: StudyProgress['study'], fallback: string): string {
  const display = study.sponsor?.display;
  return display && display.trim().length > 0 ? display : fallback;
}

function studyTitleOf(study: StudyProgress['study']): string {
  return study.title ?? study.id ?? '';
}

function titleOf(
  titleMap: ReadonlyMap<string, QuestionnaireInfo>,
  questionnaireId: string
): string {
  return titleMap.get(questionnaireId)?.title ?? questionnaireId;
}

function minutesOf(
  titleMap: ReadonlyMap<string, QuestionnaireInfo>,
  questionnaireId: string
): number | null {
  return titleMap.get(questionnaireId)?.durationMinutes ?? null;
}

function SharedNote({ item }: Readonly<{ item: UpNextItem }>) {
  const t = useTranslations('research');
  if (item.studies.length < 2) return null;
  const titles = item.studies
    .map(entry => studyTitleOf(entry.study))
    .join(', ');
  return (
    <p
      data-testid='up-next-shared-note'
      className='text-muted-foreground text-xs'
    >
      {t('up_next.shared_note', { count: item.studies.length, titles })}
    </p>
  );
}

function StartButton({
  questionnaireId,
  minutes,
  onStart
}: Readonly<{
  questionnaireId: string;
  minutes: number | null;
  onStart: () => void;
}>) {
  const t = useTranslations('research');
  const label =
    minutes === null
      ? t('up_next.start')
      : t('up_next.start_minutes', { minutes });
  return (
    <Button
      type='button'
      variant='action'
      data-testid={`up-next-start-${questionnaireId}`}
      onClick={onStart}
    >
      {label}
    </Button>
  );
}

function LeadCard({
  item,
  titleMap,
  groupLabel,
  onStart
}: Readonly<{
  item: UpNextItem;
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  groupLabel: string;
  onStart: (study: StudyProgress, questionnaireId: string) => void;
}>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const minutes = minutesOf(titleMap, item.questionnaireId);
  const timeLabel =
    minutes === null ? null : t('overview.time_value', { minutes });

  return (
    <article
      data-testid='up-next-lead'
      className='border-border bg-card flex flex-col gap-2 rounded-lg border p-4'
    >
      <p className='text-muted-foreground text-xs'>{groupLabel}</p>
      <h3 className='text-foreground text-base font-bold'>
        {titleOf(titleMap, item.questionnaireId)}
      </h3>
      <p className='text-charcoal-700 text-xs'>
        {t('up_next.closes', { date: formatBatchDate(item.closesOn, locale) })}
        {timeLabel === null ? null : ` · ${timeLabel}`}
      </p>
      <SharedNote item={item} />
      <StartButton
        questionnaireId={item.questionnaireId}
        minutes={minutes}
        onStart={() => onStart(item.leadStudy, item.questionnaireId)}
      />
      <p className='text-muted-foreground text-xs'>
        {t('up_next.reassurance')}
      </p>
    </article>
  );
}

function QueueRow({
  item,
  titleMap,
  groupLabel,
  onStart
}: Readonly<{
  item: UpNextItem;
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  groupLabel: string;
  onStart: (study: StudyProgress, questionnaireId: string) => void;
}>) {
  const t = useTranslations('research');
  return (
    <li
      data-testid='up-next-row'
      className='border-border flex items-center justify-between gap-3 border-b py-2 last:border-b-0'
    >
      <div className='flex min-w-0 flex-col gap-0.5'>
        <span className='text-foreground truncate text-sm font-bold'>
          {titleOf(titleMap, item.questionnaireId)}
        </span>
        <span className='text-muted-foreground text-xs'>{groupLabel}</span>
      </div>
      <Button
        type='button'
        variant='action'
        onClick={() => onStart(item.leadStudy, item.questionnaireId)}
      >
        {t('up_next.start')}
      </Button>
    </li>
  );
}

function UpToDate() {
  const t = useTranslations('research');
  return (
    <div
      data-testid='up-next-up-to-date'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <p className='text-charcoal-700 text-sm'>{t('up_next.up_to_date')}</p>
      <Button variant='link' asChild className='self-start'>
        <Link href='/studies'>{t('up_next.browse')}</Link>
      </Button>
    </div>
  );
}

function NothingJoined() {
  const t = useTranslations('research');
  return (
    <div
      data-testid='up-next-nothing-joined'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <p className='text-charcoal-700 text-sm'>{t('up_next.nothing_joined')}</p>
      <Button variant='action' asChild className='self-start'>
        <Link href='/studies'>{t('up_next.browse')}</Link>
      </Button>
    </div>
  );
}

function UpNextLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='up-next-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-40 w-full rounded-lg' />
      <Skeleton className='h-12 w-full rounded-lg' />
      <Skeleton className='h-12 w-full rounded-lg' />
    </output>
  );
}

/**
 * Participant home up-next section: the first questionnaire to answer as a
 * full card, then up to three compact rows, then the remaining count. Shows
 * the thank-you state when nothing is waiting and the prompt when the
 * participant has joined no study. Headings come from the page.
 *
 * @param props - Queue, questionnaire metadata, joined count, handlers, states.
 * @returns The section element.
 */
export default function UpNextSection({
  items,
  titleMap,
  joinedCount,
  onStart,
  isLoading = false,
  isError = false
}: Readonly<UpNextSectionProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');

  if (isLoading) return <UpNextLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='up-next-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }
  if (items.length === 0) {
    return joinedCount === 0 ? <NothingJoined /> : <UpToDate />;
  }

  const [lead, ...rest] = items;
  const rows = rest.slice(0, ROW_LIMIT);
  const remaining = rest.length - rows.length;
  const groupLabel = (item: UpNextItem) =>
    item.studies.length > 1
      ? t('up_next.for_studies', { count: item.studies.length })
      : t('up_next.for_study', {
          study: studyTitleOf(item.leadStudy.study),
          group: groupNameOf(
            item.leadStudy.study,
            t('side_facts.run_by_fallback')
          )
        });

  return (
    <section
      data-testid='up-next-section'
      className='flex flex-col gap-3'
      aria-label={t('up_next.then')}
    >
      <LeadCard
        item={lead}
        titleMap={titleMap}
        groupLabel={groupLabel(lead)}
        onStart={onStart}
      />
      {rows.length === 0 ? null : (
        <>
          <h3 className='text-foreground text-sm font-bold'>
            {t('up_next.then')}
          </h3>
          <ul className='flex flex-col'>
            {rows.map(row => (
              <QueueRow
                key={row.questionnaireId}
                item={row}
                titleMap={titleMap}
                groupLabel={groupLabel(row)}
                onStart={onStart}
              />
            ))}
          </ul>
        </>
      )}
      {remaining > 0 ? (
        <p data-testid='up-next-rest' className='text-muted-foreground text-xs'>
          {t('researcher_slide.questionnaires_other', { count: remaining })}
        </p>
      ) : null}
    </section>
  );
}
