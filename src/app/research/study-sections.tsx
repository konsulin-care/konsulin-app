import { xpForDuration } from '@/constants/research';
import type { QuestionnaireInfo } from '@/services/api/research';
import { questionnaireIdLabel } from '@/utils/fhir/questionnaire-url';
import type { StudyProgress } from '@/utils/fhir/research';
import { daysUntilBatch } from '@/utils/fhir/research';
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

/** Current batch index, closing deadline, progress bar, and counts. */
export function BatchProgress({
  progress
}: Readonly<{ progress: StudyProgress }>) {
  const { currentBatch } = progress;
  if (!currentBatch) return null;

  const completedPercent =
    progress.totalCount === 0
      ? 0
      : (progress.completedCount / progress.totalCount) * 100;

  return (
    <div className='flex flex-col gap-1 text-[11px] text-gray-600'>
      <div className='flex items-center justify-between'>
        <span className='font-bold text-black'>
          Batch {progress.batches.indexOf(currentBatch) + 1}
          {progress.isComplete ? ' completed' : ''}
        </span>
        <span>Closes in {daysUntilBatch(currentBatch.end)} days</span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-200'>
        <div
          className='h-full rounded-full bg-[#13c2c2]'
          style={{ width: `${completedPercent}%` }}
        />
      </div>
      <div className='flex items-center justify-between'>
        <span>
          {progress.completedCount}/{progress.totalCount} questionnaires
        </span>
      </div>
    </div>
  );
}

/** Horizontal strip of batch chips for a single study. */
export function TimelineStrip({
  progress
}: Readonly<{ progress: StudyProgress }>) {
  return (
    <div>
      <div className='flex items-center gap-2'>
        {progress.history.map((entry, index) => {
          const isCurrent = progress.currentBatch?.id === entry.batchId;
          const isDone = isCurrent ? progress.isComplete : entry.participated;

          let chipClass = 'bg-gray-100 text-black font-bold opacity-50';
          if (isDone) {
            chipClass = 'bg-secondary text-white';
          } else if (isCurrent) {
            chipClass =
              'bg-gray-100 text-black font-bold ring-2 ring-secondary';
          }

          return (
            <div
              key={entry.batchId}
              data-testid={`batch-chip-${entry.batchId}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${chipClass}`}
            >
              B{index + 1}
            </div>
          );
        })}
      </div>
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
      {batch.questionnaireIds.map(id => {
        const done = completed.has(id);
        const otherStudies = (overlapMap.get(id) ?? []).filter(
          title => title !== studyTitle
        );
        const info = titleMap?.get(id);
        const title =
          info?.title ?? (isTitlesLoading ? null : questionnaireIdLabel(id));
        return (
          <li key={id} className='flex flex-col gap-0.5 text-xs'>
            <div className='flex items-center gap-2'>
              {done ? (
                <CheckCircle2 className='h-4 w-4 shrink-0 text-[#13c2c2]' />
              ) : (
                <Circle className='h-4 w-4 shrink-0 text-gray-300' />
              )}
              {title ? (
                <button
                  type='button'
                  onClick={e => {
                    // Keep the row's own action from opening the study card.
                    e.stopPropagation();
                    onQuestionnaireClick(progress.study.id, id);
                  }}
                  className='cursor-pointer text-left font-bold text-gray-800 hover:underline'
                >
                  {title}
                </button>
              ) : (
                <span
                  data-testid={`questionnaire-title-skeleton-${id}`}
                  className='h-3.5 w-24 animate-pulse rounded bg-gray-200'
                />
              )}
              {info?.durationMinutes != null && (
                <span className='text-[10px] font-bold text-[#13c2c2]'>
                  +{xpForDuration(info.durationMinutes)} XP
                </span>
              )}
            </div>
            {showOverlapHints && otherStudies.length > 0 && (
              <span className='pl-6 text-[10px] text-gray-500'>
                Also counts toward {otherStudies.join(', ')}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
