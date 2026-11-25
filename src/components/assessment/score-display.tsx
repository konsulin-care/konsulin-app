import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  questionnaireIdLabel,
  questionnaireIdOf
} from '@/utils/fhir/questionnaire-url';
import { getScoreColor, parseDimensionScores } from '@/utils/fhir/scores';
import type { QuestionnaireResponse } from 'fhir/r4';
import { NotepadTextIcon } from 'lucide-react';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const RESULT_BRIEF_CLAIM = 'Claim the results to request analysis.';

interface ScoreDisplayProps {
  questionnaireResponse: QuestionnaireResponse | null;
  isLoading?: boolean;
  resultBrief?: string | null;
  loadingSkeleton?: boolean;
  /** Resolved Questionnaire.title, or undefined to show the all-caps id. */
  questionnaireTitle?: string;
  /**
   * Whether to render the Result Brief block at all. Defaults to true.
   * Surfaces that never show a brief (for example the record page without a
   * reading or a stored brief) pass false to hide the block and its claim
   * prompt entirely.
   */
  showBrief?: boolean;
}

/**
 * Result Brief block. Rendered only when `showBrief` is true; the claim
 * prompt covers the empty state.
 *
 * @param props - Visibility flag, loading state and resolved brief text.
 * @returns The block, or null when the brief should be hidden.
 */
function ResultBriefBlock({
  showBrief,
  showLoading,
  brief
}: Readonly<{
  showBrief: boolean;
  showLoading: boolean;
  brief: string;
}>) {
  if (!showBrief) return null;

  return (
    <div className='mb-4'>
      <div className='text-12 text-muted-foreground mb-2'>Result Brief</div>

      {showLoading ? (
        <Skeleton className='bg-muted h-[80px] w-full rounded-lg' />
      ) : (
        <div className='card'>
          <ReactMarkdown>{brief}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/**
 * Displays assessment scores and result brief from a QuestionnaireResponse.
 *
 * Pure presentational component — no data fetching, no auth gating.
 * When `resultBrief` is null, shows "Claim the results to request analysis."
 * When `resultBrief` is a string, displays it as-is. When `showBrief` is
 * false the Result Brief block is not rendered at all.
 */
export default function ScoreDisplay({
  questionnaireResponse,
  isLoading = false,
  resultBrief,
  loadingSkeleton = false,
  questionnaireTitle,
  showBrief = true
}: Readonly<ScoreDisplayProps>) {
  const scoreList = useMemo(
    () => parseDimensionScores(questionnaireResponse),
    [questionnaireResponse]
  );

  const displayResultBrief = useMemo<string>(() => {
    return resultBrief ?? RESULT_BRIEF_CLAIM;
  }, [resultBrief]);

  // Questionnaire.title when resolved; otherwise the all-caps questionnaire id.
  const questionnaireId = questionnaireIdOf(
    questionnaireResponse?.questionnaire
  );
  const displayQuestionnaireName =
    questionnaireTitle ??
    (questionnaireId ? questionnaireIdLabel(questionnaireId) : '');

  const showLoading = (isLoading || loadingSkeleton) && !questionnaireResponse;

  if (!questionnaireResponse && !showLoading) {
    return null;
  }

  return (
    <>
      {questionnaireResponse?.questionnaire && (
        <div className='card mb-4 flex items-center'>
          <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          {displayQuestionnaireName}
        </div>
      )}

      <ResultBriefBlock
        showBrief={showBrief}
        showLoading={showLoading}
        brief={displayResultBrief}
      />

      <div className='mb-4'>
        <div className='text-12 text-muted-foreground mb-2'>Result Tables</div>

        {showLoading ? (
          <Skeleton className='bg-muted h-[50px] w-full rounded-lg' />
        ) : (
          <div className='bg-muted space-y-2 rounded-lg p-4'>
            {scoreList.map(item => {
              const barColor = getScoreColor(item.name);
              return (
                <div
                  key={item.name}
                  className='grid grid-cols-[170px_1fr_30px] items-center gap-3'
                >
                  <span className='text-wrap break-words'>{item.name}</span>
                  <Progress value={item.score} color={barColor} />
                  <span className='text-sm'>{item.percentage}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
