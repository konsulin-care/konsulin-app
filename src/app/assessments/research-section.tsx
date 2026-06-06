'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatDateRange } from '@/utils/dateUtils';
import { ResearchStudy } from 'fhir/r4';
import Image from 'next/image';

type OngoingResearchItem = {
  resource: ResearchStudy;
  questionnaireIds: string[];
};

interface ResearchSectionProps {
  research: OngoingResearchItem[] | undefined;
  researchLoading: boolean;
  isAuthLoading: boolean;
  onResearchClick: (study: ResearchStudy, questionnaireId?: string) => void;
}

const filteredResearch = (
  research: OngoingResearchItem[] | undefined
): OngoingResearchItem[] => {
  if (!research) return [];
  return research.filter(item => item?.resource);
};

export default function ResearchSection({
  research,
  researchLoading,
  isAuthLoading,
  onResearchClick
}: ResearchSectionProps) {
  if (researchLoading || isAuthLoading) {
    return (
      <div className='text-muted mt-4 mb-2 px-4'>
        <CardLoader item={2} />
      </div>
    );
  }

  return (
    <div className='text-muted mt-4 mb-2 px-4'>
      <div className='text-[14px] font-bold'>Ongoing Research</div>
      {filteredResearch(research).length > 0 ? (
        <>
          <div className='text-[10px]'>
            Your heart is valuable. Please participate in our ongoing study to
            help us help you more. We will send you the result if you need to
            know.
          </div>
          <ScrollArea className='mt-2 w-full whitespace-nowrap'>
            <div className='flex w-max space-x-4 pb-4'>
              {filteredResearch(research).map((item: OngoingResearchItem) => {
                const questionnaireId = item.questionnaireIds?.[0];
                return (
                  <div
                    key={item.resource.id}
                    className='card flex min-h-[168px] max-w-[280px] cursor-default flex-col gap-2 bg-white'
                  >
                    <div className='flex flex-1 gap-2'>
                      <Image
                        className='h-[64px] w-[64px] rounded-[8px] object-cover'
                        src={'/images/clinic.jpg'}
                        height={64}
                        width={64}
                        alt='clinic'
                      />
                      <div className='flex flex-col text-[12px]'>
                        <div className='font-bold text-wrap text-black'>
                          {item.resource.title}
                        </div>
                        <div
                          className='overflow-hidden leading-4 text-wrap'
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {item.resource.description?.length > 100
                            ? `${item.resource.description.slice(0, 100)}...`
                            : item.resource.description}
                        </div>
                      </div>
                    </div>
                    <hr />
                    <div className='mt-auto flex items-center justify-between'>
                      <div className='mr-4'>
                        <div className='text-[10px]'>Research period:</div>
                        <div className='text-[10px] font-bold text-black'>
                          {item.resource.period &&
                            formatDateRange(
                              item.resource.period.start,
                              item.resource.period.end
                            )}
                        </div>
                      </div>

                      {questionnaireId && (
                        <div
                          role='button'
                          tabIndex={0}
                          className='bg-secondary cursor-pointer rounded-[32px] px-4 py-2 text-sm font-bold text-white'
                          onClick={() => {
                            onResearchClick(item.resource, questionnaireId);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ')
                              onResearchClick(item.resource, questionnaireId);
                          }}
                        >
                          Participate
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </>
      ) : (
        <EmptyState
          subtitle='There are currently no research studies available. Please check back later.'
          title='No ongoing research'
        />
      )}
    </div>
  );
}
