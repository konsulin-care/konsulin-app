import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
}

/**
 * Displays assessment scores and result brief from a QuestionnaireResponse.
 *
 * Pure presentational component — no data fetching, no auth gating.
 * When `resultBrief` is null, shows "Claim the results to request analysis."
 * When `resultBrief` is a string, displays it as-is.
 */
export default function ScoreDisplay({
  questionnaireResponse,
  isLoading = false,
  resultBrief,
  loadingSkeleton = false
}: Readonly<ScoreDisplayProps>) {
  const scoreList = useMemo(
    () => parseDimensionScores(questionnaireResponse),
    [questionnaireResponse]
  );

  const displayResultBrief = useMemo<string>(() => {
    return resultBrief ?? RESULT_BRIEF_CLAIM;
  }, [resultBrief]);

  const showLoading = (isLoading || loadingSkeleton) && !questionnaireResponse;

  if (!questionnaireResponse && !showLoading) {
    return null;
  }

  return (
    <>
      {questionnaireResponse?.questionnaire && (
        <div className='card mb-4 flex items-center'>
          <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          {questionnaireResponse.questionnaire.split('/')[1] ?? ''}
        </div>
      )}

      <div className='mb-4'>
        <div className='text-12 text-muted mb-2'>Result Brief</div>

        {showLoading ? (
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        ) : (
          <div className='card'>
            <ReactMarkdown>{displayResultBrief}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className='mb-4'>
        <div className='text-12 text-muted mb-2'>Result Tables</div>

        {showLoading ? (
          <Skeleton className='h-[50px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        ) : (
          <div className='space-y-2 rounded-lg bg-[#F9F9F9] p-4'>
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
