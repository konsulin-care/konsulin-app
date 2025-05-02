'use client';

import BackButton from '@/components/general/back-button';
import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  useOngoingResearch,
  usePopularAssessments,
  useRegularAssessments
} from '@/services/api/assessment';
import {
  IAssessmentEntry,
  IAssessmentResource,
  IResearchListResource,
  IResearchResource
} from '@/types/assessment';
import { format, parseISO } from 'date-fns';
import { AwardIcon, BookmarkIcon, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const dateFormat = (date: string) => {
  if (!date) return;

  return format(parseISO(date), 'dd MMMM yyyy');
};

const filteredResearch = (researchArr: IAssessmentEntry[]) =>
  researchArr.filter(
    (item: IAssessmentEntry) => item.resource.resourceType === 'ResearchStudy'
  );

export default function Assessment() {
  const [drawerResearchContent, setDrawerResearchContent] = useState(null);
  const [url, setUrl] = useState('');
  // const [query, setQuery] = useState('');

  const { data: popularAssessments, isLoading: popularLoading } =
    usePopularAssessments();
  const { data: regularAssessments, isLoading: regularLoading } =
    useRegularAssessments();
  const { data: research, isLoading: researchLoading } = useOngoingResearch();
  // const { data: searchResult, isLoading: searchLoading } =
  //   useSearchQuestionnaire('Five');

  /* Filters the 'research' array to find list items that reference the given researchId.
   * It matches the researchId with the part of the reference after the last '/'. */
  const findListData = (researchId: string) => {
    return research.filter(
      (item: IAssessmentEntry) =>
        item.resource.resourceType === 'List' &&
        item.resource.entry.some(
          entry => entry.item.reference.split('/').pop() === researchId
        )
    );
  };

  const getMergedData = (
    researchId: string,
    researchStudy: IResearchResource
  ) => {
    const relatedLists = findListData(researchId);

    return { ...researchStudy, relatedLists };
  };

  const handleResearchClick = mergedData => {
    // const mergedData = getMergedData(researchId, researchStudy);

    // if (!mergedData.relatedLists[0]) return;

    const questionnaireUrl =
      mergedData.relatedLists[0].resource.entry[1].item.reference
        .split('/')
        .pop();

    setDrawerResearchContent(mergedData);
    setUrl(questionnaireUrl);
  };

  const customMarkdownComponents = {
    p: ({ children }) => <span>{children}</span>
  };

  const renderDrawerContent = (
    data: IResearchResource | IAssessmentResource | IResearchListResource
  ) => {
    if (!data) return;

    return (
      <div className='flex flex-col'>
        <DrawerHeader className='mx-auto text-[20px] font-bold'>
          {data &&
            data.resourceType === 'ResearchStudy' &&
            data.note.length !== 0 && (
              <Badge
                style={{ justifySelf: 'center' }}
                className='flex w-fit rounded-[8px] bg-secondary px-[10px] py-[4px]'
              >
                <div className='text-xs text-white'>
                  Estimated time: ~{data.note[0].text}
                </div>
              </Badge>
            )}
          <DrawerTitle className='text-center text-2xl'>
            {data.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className='card mt-4 border-0 bg-[#F9F9F9]'>
          <div className='font-bold'>Brief</div>
          <hr className='my-4 border-black opacity-10' />
          <div className='flex flex-wrap gap-[10px] text-sm'>
            <DrawerDescription>
              <ReactMarkdown components={customMarkdownComponents}>
                {data && 'description' in data && data.description}
              </ReactMarkdown>
            </DrawerDescription>
          </div>
        </div>

        {data && data.resourceType === 'ResearchStudy' && (
          <div>
            <div className='mt-4 font-bold'>Researcher</div>
            {data.contact.map((item, index) => (
              <div
                className='card mt-2 border-0 bg-[#F9F9F9] text-sm'
                key={index}
              >
                {item.name}
              </div>
            ))}
          </div>
        )}

        {/* used data from relatedLists that have been merged before */}
        <DrawerFooter className='mt-2 flex flex-col'>
          {data && 'relatedLists' in data ? (
            <Link href={`assessments/${url}`}>
              <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
                Mulai
              </Button>
            </Link>
          ) : (
            <Link href={`assessments/${data.id}`}>
              <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
                Start Test
              </Button>
            </Link>
          )}
          <DrawerClose className='items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50'>
            Close
          </DrawerClose>
        </DrawerFooter>
      </div>
    );
  };

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full items-center'>
          <BackButton />
          <div className='text-[14px] font-bold text-white'>
            Assesment Centre
          </div>
        </div>
      </Header>

      {/* TODO: add search feature */}
      <ContentWraper className='pt-4'>
        <div className='flex gap-4 px-4'>
          <InputWithIcon
            placeholder='Search Asessment'
            className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            // onInput={e => {
            //   const input = e.target as HTMLInputElement;
            //   // setQuery(input.value);
            //   const { data: test } = useSearchQuestionnaire(input.value);
            //   console.log('testtest', test);
            // }}
          />
          {/* <Button */}
          {/*   variant='outline' */}
          {/*   className={cn( */}
          {/*     'flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]' */}
          {/*   )} */}
          {/* > */}
          {/*   <FilterIcon */}
          {/*     width={20} */}
          {/*     height={20} */}
          {/*     className='min-h-[20px] min-w-[20px]' */}
          {/*     fill='#13c2c2' */}
          {/*   /> */}
          {/* </Button> */}
        </div>

        <div className='mb-2 mt-4 px-4 text-muted'>
          <div className='text-[14px] font-bold'>On-going Research</div>
          <div className='text-[10px]'>
            Your heart is valuable. Please participate in our ongoing study to
            help us help you more. We will send you the result if you need to
            know.
          </div>
          <ScrollArea className='mt-2 w-full whitespace-nowrap'>
            {researchLoading || !research ? (
              <CardLoader item={2} />
            ) : (
              <div className='flex w-max space-x-4 pb-4'>
                {filteredResearch(research).map(
                  (
                    item: IAssessmentEntry & { resource: IResearchResource }
                  ) => {
                    const mergedData = getMergedData(
                      item.resource.id,
                      item.resource
                    );
                    return (
                      <div
                        key={item.resource.id}
                        className='card flex max-w-[280px] cursor-default flex-col gap-2 bg-white'
                      >
                        <div className='flex gap-2'>
                          <Image
                            className='h-[64px] w-[64px] rounded-[8px] object-cover'
                            src={'/images/clinic.jpg'}
                            // NOTE: replace with this src later on
                            // src={item.resource.relatedArtifact[0].resource}
                            height={64}
                            width={64}
                            alt='clinic'
                          />
                          <div className='flex flex-col text-[12px]'>
                            <div className='text-wrap font-bold text-black'>
                              {item.resource.title}
                            </div>
                            <div className='overflow-hidden text-wrap'>
                              {item.resource.description?.length > 100
                                ? `${item.resource.description.slice(0, 100)}...`
                                : item.resource.description}
                            </div>
                          </div>
                        </div>
                        <hr />
                        <div className='flex items-center justify-between'>
                          <div className='mr-4'>
                            <div className='text-[10px]'>Pengambilan data:</div>
                            <div className='text-[10px] font-bold text-black'>
                              {item.resource.period &&
                                `${dateFormat(item.resource.period.start)} -
                          ${dateFormat(item.resource.period.end)}`}
                            </div>
                          </div>

                          <Drawer>
                            <DrawerTrigger>
                              {mergedData.relatedLists[0] && (
                                <div
                                  className='cursor-pointer rounded-[32px] bg-secondary px-4 py-2 text-sm font-bold text-white'
                                  onClick={() =>
                                    handleResearchClick(mergedData)
                                  }
                                >
                                  Gabung
                                </div>
                              )}
                            </DrawerTrigger>
                            <DrawerContent className='mx-auto max-w-screen-sm p-4'>
                              <div className='mt-4'>
                                {renderDrawerContent(drawerResearchContent)}
                              </div>
                            </DrawerContent>
                          </Drawer>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>

        <div className='bg-[#F9F9F9] p-4'>
          <div className='mb-2 text-[14px] font-bold text-muted'>
            Popular Assessment
          </div>

          <ScrollArea className='w-full whitespace-nowrap'>
            {popularLoading || !popularAssessments ? (
              <CardLoader item={2} />
            ) : (
              <div className='flex w-max space-x-4 pb-4'>
                {popularAssessments.map(
                  (
                    assessment: IAssessmentEntry & {
                      resource: IAssessmentResource;
                    }
                  ) => (
                    <Drawer key={assessment.resource.id}>
                      <DrawerTrigger className='card flex flex-col gap-4 bg-white'>
                        <div className='flex items-start justify-between'>
                          <Image
                            src={'/images/exercise.svg'}
                            height={40}
                            width={40}
                            alt='exercise'
                          />
                          <div className='flex min-w-[192px] justify-end gap-2'>
                            <Badge className='flex items-center rounded-[8px] bg-secondary px-[10px] py-[4px]'>
                              <AwardIcon size={16} color='white' fill='white' />
                              <div className='text-[10px] text-white'>
                                Best Impact
                              </div>
                            </Badge>
                            <Badge className='rounded-[8px] bg-secondary px-[10px] py-[4px]'>
                              <BookmarkIcon
                                size={16}
                                color='white'
                                fill='white'
                              />
                            </Badge>
                          </div>
                        </div>

                        <div className='flex flex-col items-start'>
                          {/* NOTE: not provided by api */}
                          {/* <span className='text-[10px] text-muted'>6 Minutes</span> */}
                          <span className='text-[12px] font-bold'>
                            {assessment.resource.title}
                          </span>
                          <span className='mt-2 max-w-[250px] overflow-hidden truncate text-ellipsis text-[10px] text-muted'>
                            {assessment.resource.description}
                          </span>
                        </div>
                      </DrawerTrigger>

                      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
                        <div className='mt-4'>
                          {renderDrawerContent(assessment.resource)}
                        </div>
                      </DrawerContent>
                    </Drawer>
                  )
                )}
              </div>
            )}
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>

        <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Browse Instruments
          </div>

          {regularLoading ? (
            <CardLoader item={4} />
          ) : (
            <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-2'>
              {regularAssessments.map((assessment: IAssessmentEntry) => (
                <Drawer key={assessment.resource.id}>
                  <DrawerTrigger className='card item flex flex-col p-2'>
                    <div className='flex items-center'>
                      <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                        <Image
                          className='h-[24px] w-[24px] object-cover'
                          src={'/images/note.svg'}
                          width={24}
                          height={24}
                          alt='note'
                        />
                      </div>
                      <div className='text-[12px] text-[hsla(220,9%,19%,1)]'>
                        {assessment.resource.title}
                      </div>
                    </div>
                  </DrawerTrigger>
                  <DrawerContent className='mx-auto max-w-screen-sm p-4'>
                    <div className='mt-4'>
                      {renderDrawerContent(assessment.resource)}
                    </div>
                  </DrawerContent>
                </Drawer>
              ))}
            </div>
          )}
        </div>
      </ContentWraper>
    </>
  );
}
