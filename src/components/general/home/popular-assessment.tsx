import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePopularAssessments } from '@/services/api/assessment';
import { BundleEntry, Questionnaire } from 'fhir/r4';
import { ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import CardLoader from '../card-loader';
import AssessmentDrawerContent from './assessment-drawer-content';

/**
 *
 */
export default function PopularAssessment() {
  const { data: popularAssessments, isLoading: popularLoading } =
    usePopularAssessments();

  const [selectedAssessment, setSelectedAssessment] =
    useState<Questionnaire | null>(null);

  return (
    <div className='bg-[#F9F9F9] p-4'>
      <div className='text-muted flex justify-between'>
        <span className='mb-2 text-[14px] font-bold'>Popular Assessment</span>
        <Link className='text-[12px]' href={'/assessments'}>
          See All
        </Link>
      </div>

      <ScrollArea className='w-full pb-4 whitespace-nowrap'>
        {(() => {
          if (popularLoading) {
            return <CardLoader item={2} height='h-[80px]' />;
          }
          if (popularAssessments && popularAssessments.length > 0) {
            return (
              <div className='flex w-max space-x-4'>
                {popularAssessments.map(
                  (assessment: BundleEntry<Questionnaire>) => (
                    <Drawer key={assessment.resource.id}>
                      <DrawerTrigger
                        className='card flex w-fit shrink-0 items-center gap-2 bg-white'
                        onClick={() =>
                          setSelectedAssessment(assessment.resource)
                        }
                      >
                        <Image
                          src='/images/exercise.svg'
                          height={40}
                          width={40}
                          alt='exercise'
                        />
                        <div className='flex flex-col items-start'>
                          <span className='text-[12px] font-bold'>
                            {assessment.resource.title}
                          </span>
                          <span className='text-muted max-w-[200px] truncate text-[10px] text-ellipsis'>
                            {assessment.resource.description}
                          </span>
                        </div>
                        <ChevronRightIcon className='text-muted' />
                      </DrawerTrigger>

                      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
                        <div className='mt-4'>
                          <AssessmentDrawerContent
                            assessment={selectedAssessment}
                          />
                        </div>
                      </DrawerContent>
                    </Drawer>
                  )
                )}
              </div>
            );
          }
          return (
            <div className='px-2 py-4 text-sm text-gray-500'>
              No popular assessments available.
            </div>
          );
        })()}
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );
}
