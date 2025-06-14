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
  DrawerTitle
} from '@/components/ui/drawer';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth/authContext';
import {
  useOngoingResearch,
  usePopularAssessments,
  useRegularAssessments
} from '@/services/api/assessment';
import { customMarkdownComponents } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import {
  BundleEntry,
  FhirResource,
  List,
  Questionnaire,
  ResearchStudy
} from 'fhir/r4';
import { AwardIcon, BookmarkIcon, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import QRCode from 'react-qr-code';

const dateFormat = (date: string) => {
  if (!date) return;

  return format(parseISO(date), 'dd MMMM yyyy');
};

const filteredResearch = (researchArr: BundleEntry[]) =>
  researchArr.filter(
    (item: BundleEntry) => item.resource.resourceType === 'ResearchStudy'
  );

export default function Assessment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const isDrawerOpenParam = searchParams.get('isDrawerOpen') === 'true';
  const assessmentIdParam = searchParams.get('assessmentId');
  const [currentLocation, setCurrentLocation] = useState<string>('');

  const [researchUrl, setResearchUrl] = useState('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedAssessment, setSelectedAssessment] = useState<
    Questionnaire | (ResearchStudy & { relatedLists: BundleEntry<List>[] })
  >(null);
  // const [query, setQuery] = useState('');

  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: popularAssessments, isLoading: popularLoading } =
    usePopularAssessments();
  const { data: regularAssessments, isLoading: regularLoading } =
    useRegularAssessments();
  const { data: research, isLoading: researchLoading } = useOngoingResearch();
  // const { data: searchResult, isLoading: searchLoading } =
  //   useSearchQuestionnaire('Five');

  const isPractitioner = authState?.userInfo?.role_name === 'practitioner';

  useEffect(() => {
    if (isDrawerOpenParam && assessmentIdParam) {
      const found = findAssessmentById(assessmentIdParam);
      if (found) {
        setSelectedAssessment(found);
        setIsOpen(true);
      }
    }
  }, [
    isDrawerOpenParam,
    assessmentIdParam,
    popularAssessments,
    regularAssessments,
    research
  ]);

  const findAssessmentById = (id: string) => {
    const allAssessments = [
      ...(popularAssessments || []),
      ...(regularAssessments || []),
      ...(research || [])
    ];

    return allAssessments.find(item => item.resource.id === id)?.resource;
  };

  /* Filters the 'research' array to find list items that reference the given researchId.
   * It matches the researchId with the part of the reference after the last '/'. */
  const findListData = (researchId: string) => {
    return research.filter(
      (item: BundleEntry) =>
        item.resource.resourceType === 'List' &&
        item.resource.entry.some(
          entry => entry.item.reference.split('/').pop() === researchId
        )
    );
  };

  const getMergedData = (researchId: string, researchStudy: FhirResource) => {
    const relatedLists = findListData(researchId);

    return { ...researchStudy, relatedLists };
  };

  const handleResearchClick = (
    mergedData: ResearchStudy & { relatedLists: BundleEntry<List>[] }
  ) => {
    if (!mergedData || mergedData.relatedLists.length === 0) return;

    const questionnaireUrl =
      mergedData.relatedLists[0].resource.entry[1].item.reference
        .split('/')
        .pop();

    const params = new URLSearchParams(window.location.search);
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', mergedData.id);

    router.push(`?${params.toString()}`, { scroll: false });
    setSelectedAssessment(mergedData);
    setResearchUrl(questionnaireUrl);

    const fullUrl = `${baseUrl}${pathname}?${params.toString()}`;
    setCurrentLocation(fullUrl);
  };

  const handleAssessmentClick = (assessment: Questionnaire) => {
    if (!assessment) return;

    const params = new URLSearchParams(window.location.search);
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', assessment.id);
    router.push(`?${params.toString()}`, { scroll: false });
    setSelectedAssessment(assessment);

    const fullUrl = `${baseUrl}${pathname}?${params.toString()}`;
    setCurrentLocation(fullUrl);
  };

  const handleDrawerClose = () => {
    setIsOpen(false);

    const params = new URLSearchParams(window.location.search);
    params.delete('isDrawerOpen');
    params.delete('assessmentId');

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const renderDrawerPractitionerContent = (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        {selectedAssessment &&
          selectedAssessment.resourceType === 'ResearchStudy' &&
          selectedAssessment.note.length !== 0 && (
            <Badge
              style={{ justifySelf: 'center' }}
              className='flex w-fit rounded-[8px] bg-secondary px-[10px] py-[4px]'
            >
              <div className='text-xs text-white'>
                Estimated time: ~{selectedAssessment.note[0].text}
              </div>
            </Badge>
          )}
        <DrawerTitle className='text-center text-2xl'>
          {selectedAssessment && selectedAssessment.title}
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription>
        <QRCode
          size={150}
          style={{
            height: '290px',
            maxWidth: '100%',
            width: '100%',
            margin: '32px 0'
          }}
          value={currentLocation}
          viewBox={`0 0 256 256`}
        />
      </DrawerDescription>

      {selectedAssessment && (
        <DrawerFooter className='mt-2 flex flex-col p-0 py-4'>
          <Link
            href={`assessments/${'relatedLists' in selectedAssessment ? researchUrl : selectedAssessment.id}`}
          >
            <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
              Isi assessment untuk Pasien
            </Button>
          </Link>
          <DrawerClose className='items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50'>
            Close
          </DrawerClose>
        </DrawerFooter>
      )}
    </div>
  );

  const renderDrawerPatientContent = (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        {selectedAssessment &&
          selectedAssessment.resourceType === 'ResearchStudy' &&
          selectedAssessment.note.length !== 0 && (
            <Badge
              style={{ justifySelf: 'center' }}
              className='flex w-fit rounded-[8px] bg-secondary px-[10px] py-[4px]'
            >
              <div className='text-xs text-white'>
                Estimated time: ~{selectedAssessment.note[0].text}
              </div>
            </Badge>
          )}
        <DrawerTitle className='text-center text-2xl'>
          {selectedAssessment && selectedAssessment.title}
        </DrawerTitle>
      </DrawerHeader>
      <div className='card mt-4 border-0 bg-[#F9F9F9]'>
        <div className='font-bold'>Brief</div>
        <hr className='my-4 border-black opacity-10' />
        <div className='flex flex-wrap gap-[10px] text-sm'>
          <DrawerDescription>
            <ReactMarkdown components={customMarkdownComponents}>
              {selectedAssessment &&
                'description' in selectedAssessment &&
                selectedAssessment.description}
            </ReactMarkdown>
          </DrawerDescription>
        </div>
      </div>

      {selectedAssessment &&
        selectedAssessment.resourceType === 'ResearchStudy' && (
          <div>
            <div className='mt-4 font-bold'>Researcher</div>
            {selectedAssessment.contact.map((item, index) => (
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
      {selectedAssessment && (
        <DrawerFooter className='mt-2 flex flex-col p-0 py-4'>
          {'relatedLists' in selectedAssessment ? (
            <Link href={`assessments/${researchUrl}`}>
              <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
                Mulai
              </Button>
            </Link>
          ) : (
            <Link href={`assessments/${selectedAssessment.id}`}>
              <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
                Start Test
              </Button>
            </Link>
          )}
          <DrawerClose className='items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50'>
            Close
          </DrawerClose>
        </DrawerFooter>
      )}
    </div>
  );

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full items-center'>
          <BackButton route='/' />
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
            {researchLoading || isAuthLoading ? (
              <CardLoader item={2} />
            ) : (
              <div className='flex w-max space-x-4 pb-4'>
                {filteredResearch(research).map(
                  (item: BundleEntry<ResearchStudy>) => {
                    const mergedData = getMergedData(
                      item.resource.id,
                      item.resource
                    ) as ResearchStudy & { relatedLists: List[] };
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

                          {mergedData.relatedLists[0] && (
                            <div
                              className='cursor-pointer rounded-[32px] bg-secondary px-4 py-2 text-sm font-bold text-white'
                              onClick={() => {
                                handleResearchClick(mergedData);
                                setIsOpen(true);
                              }}
                            >
                              Gabung
                            </div>
                          )}
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
            {popularLoading || isAuthLoading ? (
              <CardLoader item={2} />
            ) : (
              <div className='flex w-max space-x-4 pb-4'>
                {popularAssessments.map(
                  (assessment: BundleEntry<Questionnaire>) => (
                    <div
                      key={assessment.resource.id}
                      className='card flex cursor-pointer flex-col gap-4 bg-white'
                      onClick={() => {
                        handleAssessmentClick(assessment.resource);
                        setIsOpen(true);
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
                    </div>
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

          {regularLoading || isAuthLoading ? (
            <CardLoader item={4} />
          ) : (
            <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-2'>
              {regularAssessments.map(
                (assessment: BundleEntry<Questionnaire>) => (
                  <div
                    key={assessment.resource.id}
                    className='card item flex cursor-pointer flex-col p-2'
                    onClick={() => {
                      handleAssessmentClick(assessment.resource);
                      setIsOpen(true);
                    }}
                  >
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
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </ContentWraper>

      <Drawer onClose={handleDrawerClose} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {isPractitioner
            ? renderDrawerPractitionerContent
            : renderDrawerPatientContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}
