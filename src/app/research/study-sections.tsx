import type { StudyProgress } from '@/utils/fhir/research';
import { daysUntilBatch } from '@/utils/fhir/research';
import { Check, CheckCircle2, Circle } from 'lucide-react';

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
        {progress.isComplete && (
          <span className='font-bold text-green-600'>Batch complete</span>
        )}
      </div>
    </div>
  );
}

/** Horizontal strip of batch chips for a single study. */
export function TimelineStrip({
  progress
}: Readonly<{ progress: StudyProgress }>) {
  const noun = progress.consecutiveBatches === 1 ? 'batch' : 'batches';
  return (
    <div>
      <div className='flex items-center gap-2'>
        {progress.history.map((entry, index) => {
          const isCurrent = progress.currentBatch?.id === entry.batchId;
          const isDone = entry.participated && !isCurrent;

          let chipClass = 'bg-gray-100 text-black font-bold opacity-50';
          let content: React.ReactNode = `B${index + 1}`;
          if (isCurrent) {
            chipClass = 'bg-gray-100 text-black font-bold';
          } else if (isDone) {
            chipClass = 'bg-secondary text-white';
            content = <Check className='h-4 w-4' />;
          }

          return (
            <div
              key={entry.batchId}
              data-testid={`batch-chip-${entry.batchId}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${chipClass}`}
            >
              {content}
            </div>
          );
        })}
      </div>
      <p className='mt-2 text-[11px] text-gray-500'>
        You&apos;ve completed {progress.consecutiveBatches} {noun} in a row.
      </p>
    </div>
  );
}

/** Maps a questionnaire id to a readable display name. */
function displayName(id: string): string {
  return id
    .split('-')
    .map(part => part.toUpperCase())
    .join(' ');
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
  onQuestionnaireClick
}: Readonly<{
  progress: StudyProgress;
  overlapMap: Map<string, string[]>;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
}>) {
  const batch = progress.currentBatch;
  if (!batch) return null;

  const completed = new Set(progress.completedQuestionnaireIds);
  const studyTitle = progress.study.title ?? progress.study.id;

  return (
    <ul onClick={e => e.stopPropagation()} className='flex flex-col gap-2'>
      {batch.questionnaireIds.map(id => {
        const done = completed.has(id);
        const otherStudies = (overlapMap.get(id) ?? []).filter(
          title => title !== studyTitle
        );
        return (
          <li key={id} className='flex items-start gap-2 text-xs'>
            {done ? (
              <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-[#13c2c2]' />
            ) : (
              <Circle className='mt-0.5 h-4 w-4 shrink-0 text-gray-300' />
            )}
            <div className='flex flex-col'>
              <button
                type='button'
                onClick={() => onQuestionnaireClick(progress.study.id, id)}
                className='cursor-pointer font-bold text-gray-800 hover:underline'
              >
                {displayName(id)}
              </button>
              {otherStudies.length > 0 && (
                <span className='text-[10px] text-gray-500'>
                  Also counts toward {otherStudies.join(', ')}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
