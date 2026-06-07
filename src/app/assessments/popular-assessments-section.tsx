'use client';

import CardLoader from '@/components/general/card-loader';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BundleEntry, Questionnaire } from 'fhir/r4';
import { AwardIcon, BookmarkIcon } from 'lucide-react';
import Image from 'next/image';

interface PopularAssessmentsSectionProps {
  popularAssessments: BundleEntry<Questionnaire>[];
  popularLoading: boolean;
  isAuthLoading: boolean;
  onAssessmentClick: (assessment: Questionnaire) => void;
}

export default function PopularAssessmentsSection({
  popularAssessments,
  popularLoading,
  isAuthLoading,
  onAssessmentClick
}: Readonly<PopularAssessmentsSectionProps>) {
  return (
    <div className='bg-[#F9F9F9] p-4'>
      <div className='text-muted mb-2 text-[14px] font-bold'>
        Popular Assessment
      </div>

      <ScrollArea className='w-full whitespace-nowrap'>
        {popularLoading || isAuthLoading ? (
          <CardLoader item={2} />
        ) : (
          <div className='flex w-max space-x-4 pb-4'>
            {(popularAssessments ?? []).map(
              (assessment: BundleEntry<Questionnaire>) => (
                <button
                  key={assessment.resource.id}
                  type='button'
                  className='card flex cursor-pointer flex-col gap-4 bg-white text-left'
                  onClick={() => {
                    onAssessmentClick(assessment.resource);
                  }}
                >
                  <div className='flex items-start justify-between'>
                    <Image
                      src={'/images/exercise.svg'}
                      height={40}
                      width={40}
                      alt='exercise'
                    />
                    <div className='flex min-w-[192px] justify-end gap-2'>
                      <Badge className='bg-secondary flex items-center rounded-[8px] px-[10px] py-[4px]'>
                        <AwardIcon size={16} color='white' fill='white' />
                        <div className='text-[10px] text-white'>
                          Best Impact
                        </div>
                      </Badge>
                      <Badge className='bg-secondary rounded-[8px] px-[10px] py-[4px]'>
                        <BookmarkIcon size={16} color='white' fill='white' />
                      </Badge>
                    </div>
                  </div>

                  <div className='flex flex-col items-start'>
                    <span className='text-[12px] font-bold'>
                      {assessment.resource.title}
                    </span>
                    <span className='text-muted mt-2 max-w-[250px] truncate overflow-hidden text-[10px] text-ellipsis'>
                      {assessment.resource.description}
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        )}
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );
}
