import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePopularAssessments } from '@/services/api/assessment';
import { customMarkdownComponents } from '@/utils/helper';
import { BundleEntry, Questionnaire } from 'fhir/r4';
import { ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CardLoader from '../card-loader';

export default function PopularAssessment() {
  const { data: popularAssessments, isLoading: popularLoading } =
    usePopularAssessments();

  const [selectedAssessment, setSelectedAssessment] =
    useState<Questionnaire | null>(null);

  const renderDrawerContent = (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        <DrawerTitle className='text-center text-2xl'>
          {selectedAssessment?.title}
        </DrawerTitle>
      </DrawerHeader>
      <div className='card mt-4 border-0 bg-[#F9F9F9]'>
        <div className='font-bold'>Brief</div>
        <hr className='my-4 border-black opacity-10' />
        <div className='flex flex-wrap gap-[10px] text-sm'>
          <DrawerDescription>
            <ReactMarkdown components={customMarkdownComponents}>
              {selectedAssessment?.description ?? ''}
            </ReactMarkdown>
          </DrawerDescription>
        </div>
      </div>

      <div className='mt-2 flex flex-col gap-2 py-4'>
        <Link href={`assessments/${selectedAssessment?.id}`}>
          <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
            Start Test
          </Button>
        </Link>
        <DrawerClose className='items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50'>
          Close
        </DrawerClose>
      </div>
    </div>
  );

  return (
    <div className='bg-[#F9F9F9] p-4'>
      <div className='flex justify-between text-muted'>
        <span className='mb-2 text-[14px] font-bold'>Popular Assessment</span>
        <Link className='text-[12px]' href={'/assessments'}>
          See All
        </Link>
      </div>

      <ScrollArea className='w-full whitespace-nowrap pb-4'>
        {popularLoading ? (
          <CardLoader item={2} height='h-[80px]' />
        ) : popularAssessments && popularAssessments.length > 0 ? (
          <div className='flex w-max space-x-4'>
            {popularAssessments.map(
              (assessment: BundleEntry<Questionnaire>) => (
                <Drawer key={assessment.resource.id}>
                  <DrawerTrigger
                    className='card flex w-fit shrink-0 items-center gap-2 bg-white'
                    onClick={() => setSelectedAssessment(assessment.resource)}
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
                      <span className='max-w-[200px] truncate text-ellipsis text-[10px] text-muted'>
                        {assessment.resource.description}
                      </span>
                    </div>
                    <ChevronRightIcon className='text-muted' />
                  </DrawerTrigger>

                  <DrawerContent className='mx-auto max-w-screen-sm p-4'>
                    <div className='mt-4'>{renderDrawerContent}</div>
                  </DrawerContent>
                </Drawer>
              )
            )}
          </div>
        ) : (
          <div className='px-2 py-4 text-sm text-gray-500'>
            No popular assessments available.
          </div>
        )}
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );
}
