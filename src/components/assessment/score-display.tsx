import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import { NotepadTextIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type IScore = {
  name: string;
  score: number;
  percentage: number;
};

const BASE_HUE = 170;

/** Generates a random HSL color based on a base hue. */
function generateRandomColor(baseHue: number): string {
  const hue = (baseHue + (Math.random() * 20 - 10)) % 360;
  const saturation = 70 + Math.random() * 20;
  const lightness = 45 + Math.random() * 15;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

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
}: ScoreDisplayProps) {
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  const scoreList = useMemo<IScore[]>(() => {
    if (!questionnaireResponse) return [];

    const interpretationItem = questionnaireResponse.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );

    const scoreDimensionItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) =>
        subItem.linkId === 'score-dimension'
    );

    const reference = scoreDimensionItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'reference'
    );

    const refValue = reference?.answer?.[0]?.valueInteger ?? 1;

    const result = scoreDimensionItem?.item
      .map((subItem: QuestionnaireResponseItem) => {
        if (subItem.linkId === 'reference') return null;

        const score = subItem.answer?.[0]?.valueInteger;

        if (score && refValue) {
          const newScore = score / refValue;
          const percentage = Math.round(newScore * 100);

          return {
            name: subItem.text ?? 'Score',
            score: newScore,
            percentage
          };
        }
        return null;
      })
      .filter(Boolean) as IScore[];

    return result;
  }, [questionnaireResponse]);

  const displayResultBrief = useMemo<string>(() => {
    return resultBrief ?? RESULT_BRIEF_CLAIM;
  }, [resultBrief]);

  const getColor = (name: string): string => {
    if (colorMap[name]) return colorMap[name];

    const randomColor = generateRandomColor(BASE_HUE);
    setColorMap(prevMap => ({
      ...prevMap,
      [name]: randomColor
    }));
    return randomColor;
  };

  // Persist color map changes to parent (via useEffect visibility)
  // but since this is a presentational component, colors live in local state
  // Consumers can integrate with IndexedDB externally.

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
              const barColor = getColor(item.name);
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
