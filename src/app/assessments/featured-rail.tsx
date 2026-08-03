'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Questionnaire } from 'fhir/r4';
import AssessmentCard from './assessment-card';

interface FeaturedRailProps {
  readonly questionnaires: Questionnaire[];
  readonly onAssessmentClick: (assessment: Questionnaire) => void;
}

/**
 * Horizontal scrollable rail of featured assessment cards.
 *
 * Renders a section header "Editor's Picks" and a horizontal scroll
 * of featured variant cards. Hidden when the list is empty.
 */
export default function FeaturedRail({
  questionnaires,
  onAssessmentClick
}: FeaturedRailProps) {
  if (questionnaires.length === 0) return null;

  return (
    <div className='px-4'>
      <h2 className='mb-2 text-sm font-bold text-gray-700'>
        Editor&apos;s Picks
      </h2>

      <ScrollArea className='w-full whitespace-nowrap'>
        <div className='flex gap-3 pb-2'>
          {questionnaires.map(q => (
            <AssessmentCard
              key={q.id}
              questionnaire={q}
              variant='featured'
              onClick={() => onAssessmentClick(q)}
            />
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );
}
