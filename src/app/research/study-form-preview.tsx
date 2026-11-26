'use client';

import {
  getBackItems,
  studyKind,
  timeNeeded,
  type StudyKind
} from '@/app/study/study-facts';
import StudyOverview from '@/app/study/study-overview';
import type { EthicsCode } from '@/app/study/study-side-facts';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { ResearchBatch } from '@/utils/fhir/research';
import { formatBatchDate } from '@/utils/format-batch-date';

/** One batch of the researcher form, with its draft dates. */
export interface StudyFormPreviewBatch {
  startDate: string;
  endDate: string;
  questionnaireIds: string[];
}

export interface StudyFormPreviewProps {
  title: string;
  question: string;
  description?: string;
  group: string;
  lead: string;
  whoCanJoin?: string;
  ethicsStatus: EthicsCode;
  ethicsReference?: string;
  sharesFindings: boolean;
  batches: StudyFormPreviewBatch[];
  durations: Record<string, number | undefined>;
}

type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Converts draft form batches to the study facts shape.
 * @param batches - draft batches with startDate/endDate fields
 * @returns batches shaped like stored ResearchStudy batches
 */
function toResearchBatches(batches: StudyFormPreviewBatch[]): ResearchBatch[] {
  return batches.map((batch, index) => ({
    id: `batch-${index}`,
    start: batch.startDate,
    end: batch.endDate,
    questionnaireIds: batch.questionnaireIds
  }));
}

/**
 * Resolves a preview text field, falling back to its placeholder.
 * @param value - live form value
 * @param placeholderKey - message key of the placeholder
 * @param t - research translator
 * @returns the typed value or the exact placeholder
 */
function textOrPlaceholder(
  value: string,
  placeholderKey: string,
  t: Translate
): string {
  return value.trim() ? value : t(placeholderKey);
}

/**
 * Minutes needed for the first batch, when every duration is known.
 * @param batch - first draft batch, if any
 * @param durations - minutes by questionnaire id
 * @returns total minutes or undefined
 */
function firstBatchMinutes(
  batch: ResearchBatch | undefined,
  durations: Record<string, number | undefined>
): number | undefined {
  if (!batch || batch.questionnaireIds.length === 0) return undefined;
  return timeNeeded(batch, durations);
}

/**
 * Study kind for the draft batches, using the first batch as current.
 * @param batches - draft batches in stored shape
 * @returns one-time/repeated kind, or undefined without batches
 */
function previewKind(batches: ResearchBatch[]): StudyKind | undefined {
  if (batches.length === 0) return undefined;
  return studyKind({ batches, currentBatch: batches[0] });
}

/**
 * Ethics label for the draft study.
 * @param ethics - selected ethics status
 * @param reference - optional approval reference
 * @param t - research translator
 * @returns the ethics text, with the reference when approved
 */
function ethicsText(
  ethics: EthicsCode,
  reference: string | undefined,
  t: Translate
): string {
  const label = t(`side_facts.ethics_${ethics}`);
  if (ethics !== 'approved' || !reference) return label;
  return `${label} · ${reference}`;
}

/**
 * Stable list key for a draft batch, independent of its index.
 * @param batch - draft batch with its dates and questionnaire ids
 * @returns a key built from the draft fields
 */
function batchKey(batch: StudyFormPreviewBatch): string {
  return `${batch.startDate}-${batch.endDate}-${batch.questionnaireIds.join(',')}`;
}

/**
 * Draft rows for each batch date range.
 * @param props - draft batches and translator
 * @returns the batch date list
 */
function BatchDates({
  batches,
  t
}: Readonly<{ batches: StudyFormPreviewBatch[]; t: Translate }>) {
  const locale = useLocale();
  if (batches.length === 0) return null;
  return (
    <ul data-testid='preview-batches' className='flex flex-col gap-1 text-sm'>
      {batches.map((batch, index) => (
        <li key={batchKey(batch)} data-testid={`preview-batch-${index}`}>
          <span className='font-medium'>
            {t('batch_number', { index: index + 1 })}
          </span>
          {` · ${t('start_date_label')}: `}
          {batch.startDate ? formatBatchDate(batch.startDate, locale) : '—'}
          {` · ${t('end_date_label')}: `}
          {batch.endDate ? formatBatchDate(batch.endDate, locale) : '—'}
        </li>
      ))}
    </ul>
  );
}

/**
 * Researcher form preview of what participants will see.
 * @param props - live form values, group, lead and questionnaire durations
 * @returns the preview section
 */
export default function StudyFormPreview(
  props: Readonly<StudyFormPreviewProps>
) {
  const t = useTranslations('research');
  const batches = toResearchBatches(props.batches);
  const first = batches[0];
  const getBack = getBackItems(
    { batches, currentBatch: first },
    { sharesFindings: props.sharesFindings }
  );
  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-lg font-semibold'>{t('preview.heading')}</h2>
      <StudyOverview
        headingLevel='h3'
        title={textOrPlaceholder(props.title, 'preview.title_placeholder', t)}
        question={textOrPlaceholder(
          props.question,
          'preview.question_placeholder',
          t
        )}
        description={props.description}
        group={props.group}
        lead={props.lead}
        whoCanJoin={props.whoCanJoin}
        kind={previewKind(batches)}
        minutes={firstBatchMinutes(first, props.durations)}
        getBack={getBack}
      />
      <dl className='flex flex-col gap-1 text-sm'>
        <dt className='text-muted-foreground'>{t('side_facts.ethics')}</dt>
        <dd>{ethicsText(props.ethicsStatus, props.ethicsReference, t)}</dd>
      </dl>
      <BatchDates batches={props.batches} t={t} />
    </section>
  );
}
