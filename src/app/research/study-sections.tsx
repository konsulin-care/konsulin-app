import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { QuestionnaireInfo } from '@/services/api/research';
import { questionnaireIdLabel } from '@/utils/fhir/questionnaire-url';
import type { StudyProgress } from '@/utils/fhir/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { CheckCircle2, Circle } from 'lucide-react';

/**
 * Limits a description to maxLength characters, appending an ellipsis.
 *
 * @param description - Raw description text.
 * @param maxLength - Maximum characters before truncation.
 * @returns The truncated text with a trailing ellipsis.
 */
export function truncateDescription(
  description: string | undefined,
  maxLength = 200
): string {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return `${description.slice(0, maxLength).trimEnd()}…`;
}

/** Current batch line for a study. */
export function BatchProgress({
  progress
}: Readonly<{ progress: StudyProgress }>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const { currentBatch } = progress;
  if (!currentBatch) return null;

  const batchKey = progress.isComplete
    ? 'batch_line.completed'
    : 'batch_line.current';

  return (
    <div className='text-muted-foreground flex flex-col gap-1 text-xs'>
      <span data-testid='batch-line' className='text-foreground font-bold'>
        {t(batchKey, {
          index: progress.batches.indexOf(currentBatch) + 1,
          total: progress.batches.length,
          date: formatBatchDate(currentBatch.end, locale)
        })}
      </span>
    </div>
  );
}

/** Maps each questionnaire to every study title that deploys it. */
export function buildOverlapMap(
  studies: StudyProgress[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const study of studies) {
    for (const id of study.currentBatch?.questionnaireIds ?? []) {
      const titles = map.get(id) ?? [];
      titles.push(study.study.title ?? study.study.id);
      map.set(id, titles);
    }
  }
  return map;
}

/** Questionnaire list for one study with done states and overlap hints. */
interface QuestionnaireRowProps {
  id: string;
  studyId: string;
  done: boolean;
  otherStudies: string[];
  info?: QuestionnaireInfo;
  isTitlesLoading: boolean;
  showOverlapHints: boolean;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
}

/** Render a single questionnaire row with completion status. */
function QuestionnaireRow({
  id,
  studyId,
  done,
  otherStudies,
  info,
  isTitlesLoading,
  showOverlapHints,
  onQuestionnaireClick
}: Readonly<QuestionnaireRowProps>) {
  const title =
    info?.title ?? (isTitlesLoading ? null : questionnaireIdLabel(id));

  return (
    <li className='flex flex-col gap-0.5 text-xs'>
      <div className='flex items-center gap-2'>
        {done ? (
          <CheckCircle2 className='text-turquoise-deep h-4 w-4 shrink-0' />
        ) : (
          <Circle className='text-muted-foreground h-4 w-4 shrink-0' />
        )}
        {title ? (
          <button
            type='button'
            onClick={e => {
              e.stopPropagation();
              onQuestionnaireClick(studyId, id);
            }}
            className='text-charcoal-700 pointer-events-auto cursor-pointer text-left font-bold hover:underline'
          >
            {title}
          </button>
        ) : (
          <span
            data-testid={`questionnaire-title-skeleton-${id}`}
            className='bg-muted h-3.5 w-24 animate-pulse rounded'
          />
        )}
      </div>
      {showOverlapHints && otherStudies.length > 0 && (
        <span className='text-muted-foreground pl-6 text-xs'>
          Also counts toward {otherStudies.join(', ')}
        </span>
      )}
    </li>
  );
}

/** Questionnaire list for one study with done states and overlap hints. */
export function QuestionnaireList({
  progress,
  overlapMap,
  onQuestionnaireClick,
  titleMap,
  isTitlesLoading = false,
  showOverlapHints = false
}: Readonly<{
  progress: StudyProgress;
  overlapMap: Map<string, string[]>;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  /** Resolved id → questionnaire info; falls back to the id when absent. */
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
  /** True while titles are being fetched; unresolved rows show a skeleton. */
  isTitlesLoading?: boolean;
  /** Expanded views render the "Also counts toward" overlap hint. */
  showOverlapHints?: boolean;
}>) {
  const batch = progress.currentBatch;
  if (!batch) return null;

  const completed = new Set(progress.completedQuestionnaireIds);
  const studyTitle = progress.study.title ?? progress.study.id;

  return (
    <ul className='flex flex-col gap-2'>
      {batch.questionnaireIds.map(id => (
        <QuestionnaireRow
          key={id}
          id={id}
          studyId={progress.study.id}
          done={completed.has(id)}
          otherStudies={(overlapMap.get(id) ?? []).filter(
            title => title !== studyTitle
          )}
          info={titleMap?.get(id)}
          isTitlesLoading={isTitlesLoading}
          showOverlapHints={showOverlapHints}
          onQuestionnaireClick={onQuestionnaireClick}
        />
      ))}
    </ul>
  );
}
