'use client';

import BackButton from '@/components/general/back-button';
import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
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
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import {
  searchQuestionnaires,
  useOngoingResearch,
  usePopularAssessments,
  useRegularAssessments
} from '@/services/api/assessment';
import { formatDateRange } from '@/utils/dateUtils';
import { customMarkdownComponents } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { BundleEntry, Questionnaire, ResearchStudy } from 'fhir/r4';
import { AwardIcon, BookmarkIcon, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import QRCode from 'react-qr-code';

const dateFormat = (date: string) => {
  if (!date) return;

  return format(parseISO(date), 'dd MMMM yyyy');
};

type OngoingResearchItem = {
  resource: ResearchStudy;
  questionnaireIds: string[];
};

// Helper functions for assessment type detection
const isResearchStudy = (assessment: BundleEntry): boolean => {
  return assessment.resource.resourceType === 'ResearchStudy';
};

const isQuestionnaire = (assessment: BundleEntry): boolean => {
  return assessment.resource.resourceType === 'Questionnaire';
};

const filteredResearch = (
  research: OngoingResearchItem[] | undefined
): OngoingResearchItem[] => {
  if (!research) return [];
  return research.filter(item => item?.resource);
};

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
    Questionnaire | ResearchStudy | null
  >(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: popularAssessments = [], isLoading: popularLoading } =
    usePopularAssessments();
  const { data: regularAssessments = [], isLoading: regularLoading } =
    useRegularAssessments();
  const { data: research, isLoading: researchLoading } = useOngoingResearch();

  // Card component for Research Study assessments
  const ResearchAssessmentCard = ({ assessment, onClick }) => {
    return (
      <div className='flex max-w-[280px] cursor-pointer flex-col gap-2'>
        <div className='flex gap-2'>
          <Image
            className='h-[64px] w-[64px] rounded-[8px] object-cover'
            src='/images/clinic.jpg'
            height={64}
            width={64}
            alt='research'
          />
          <div className='flex flex-col text-[12px]'>
            <div className='font-bold text-wrap text-black'>
              {assessment.resource.title}
            </div>
            <div className='overflow-hidden text-wrap'>
              {assessment.resource.description?.length > 100
                ? `${assessment.resource.description.slice(0, 100)}...`
                : assessment.resource.description}
            </div>
          </div>
        </div>
        <Button
          onClick={() => onClick(assessment.resource)}
          className='bg-secondary rounded-[32px] px-4 py-2 text-sm font-bold text-white'
        >
          Join
        </Button>
      </div>
    );
  };

  // Card component for Questionnaire assessments
  const QuestionnaireAssessmentCard = ({ assessment, onClick }) => {
    return (
      <div
        className='flex cursor-pointer flex-col gap-4'
        onClick={() => onClick(assessment.resource)}
      >
        <div className='flex items-start justify-between'>
          <Image
            src='/images/exercise.svg'
            height={40}
            width={40}
            alt='exercise'
          />
        </div>
        <div className='flex flex-col items-start'>
          <span className='text-[12px] font-bold'>
            {assessment.resource.title}
          </span>
          <span className='text-muted mt-2 max-w-[250px] truncate overflow-hidden text-[10px] text-ellipsis'>
            {assessment.resource.description}
          </span>
        </div>
      </div>
    );
  };

  // AssessmentSearchResults component for rendering search results
  const AssessmentSearchResults = ({
    assessments,
    onResearchClick,
    onAssessmentClick
  }) => {
    return (
      <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
        {assessments.map((assessment: BundleEntry) => (
          <div
            key={assessment.resource.id}
            className='card flex flex-col gap-2 p-4'
          >
            {isResearchStudy(assessment) ? (
              <ResearchAssessmentCard
                assessment={assessment}
                onClick={onResearchClick}
              />
            ) : isQuestionnaire(assessment) ? (
              <QuestionnaireAssessmentCard
                assessment={assessment}
                onClick={onAssessmentClick}
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  // Combine all assessments for comprehensive search
  const allAssessments = useMemo(() => {
    return [
      ...(popularAssessments || []),
      ...(regularAssessments || []),
      ...(research || [])
    ];
  }, [popularAssessments, regularAssessments, research]);

  // Filter assessments for search (exclude research studies)
  const searchAssessments = useMemo(() => {
    // Only include questionnaires in search results, exclude research studies
    return [
      ...(popularAssessments || []),
      ...(regularAssessments || [])
    ].filter(
      (assessment: BundleEntry) =>
        assessment.resource.resourceType === 'Questionnaire'
    );
  }, [popularAssessments, regularAssessments]);

  // Implement the search hook with proper field specifications
  const {
    filteredData: filteredAssessments,
    isServerSearching,
    showServerResults,
    serverData: serverAssessments,
    serverSearchCompleted
  } = useSearchWithFallback({
    data: searchAssessments,
    searchFields: [
      { path: 'resource.title' },
      { path: 'resource.description' }
    ],
    serverSearchFunction: searchQuestionnaires,
    searchTerm,
    debounceDelay: 1000,
    minCharsForServerSearch: 3
  });

  const isPractitioner = authState?.userInfo?.role_name === Roles.Practitioner;

  useEffect(() => {
    if (!isDrawerOpenParam || !assessmentIdParam) return;
    const found = findAssessmentById(assessmentIdParam);

    if (!found) return;

    if (found.resourceType === 'ResearchStudy') {
      const researchItem = research?.find(r => r.resource.id === found.id);
      const questionnaireId = researchItem?.questionnaireIds?.[0];

      if (questionnaireId) {
        setResearchUrl(questionnaireId);
      } else {
        console.warn(
          '[Assessment] Missing questionnaireId for research:',
          found.id
        );
        return;
      }
    }

    setSelectedAssessment(found);
    setIsOpen(true);

    const params = new URLSearchParams(window.location.search);
    const fullUrl = `${baseUrl}${pathname}?${params.toString()}`;
    setCurrentLocation(fullUrl);
  }, [
    isDrawerOpenParam,
    assessmentIdParam,
    research,
    popularAssessments,
    regularAssessments
  ]);

  const findAssessmentById = (id: string) => {
    const allRegular = [
      ...(popularAssessments || []),
      ...(regularAssessments || [])
    ];

    const regularFound = allRegular.find(item => item.resource.id === id);
    if (regularFound) return regularFound.resource;

    const researchFound = research?.find(item => item.resource.id === id);
    if (researchFound) return researchFound.resource;

    return null;
  };

  const handleResearchClick = (
    study: ResearchStudy,
    questionnaireId?: string
  ) => {
    if (!study?.id) return;

    const resolvedQuestionnaireId =
      questionnaireId ??
      research?.find(item => item.resource.id === study.id)
        ?.questionnaireIds?.[0];

    if (!resolvedQuestionnaireId) {
      console.warn(
        '[Assessment] Missing questionnaireId for research:',
        study.id
      );
      return;
    }

    setSelectedAssessment(study);
    setResearchUrl(resolvedQuestionnaireId);

    const params = new URLSearchParams(window.location.search);
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', study.id);

    setIsOpen(true);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleAssessmentClick = (assessment: Questionnaire) => {
    if (!assessment) return;

    const params = new URLSearchParams(window.location.search);
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', assessment.id);
    router.push(`?${params.toString()}`, { scroll: false });
    setSelectedAssessment(assessment);
    setIsOpen(true);

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
          (selectedAssessment.note?.length ?? 0) > 0 && (
            <Badge
              style={{ justifySelf: 'center' }}
              className='bg-secondary flex w-fit rounded-[8px] px-[10px] py-[4px]'
            >
              <div className='text-xs text-white'>
                Estimated time: ~{selectedAssessment.note?.[0]?.text}
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
          <Button
            onClick={() => {
              if (
                selectedAssessment?.resourceType === 'ResearchStudy' &&
                !researchUrl
              ) {
                return;
              }
              startTransition(() => {
                router.push(
                  `assessments/${
                    selectedAssessment?.resourceType === 'ResearchStudy'
                      ? researchUrl
                      : selectedAssessment?.id
                  }`
                );
              });
            }}
            className='bg-secondary h-full w-full rounded-xl p-4 text-white'
            disabled={
              isPending ||
              (selectedAssessment?.resourceType === 'ResearchStudy' &&
                !researchUrl)
            }
          >
            {isPending ? (
              <LoadingSpinnerIcon
                width={20}
                height={20}
                stroke='white'
                className='w-full animate-spin'
              />
            ) : (
              'Isi assessment untuk Pasien'
            )}
          </Button>
          <DrawerClose className='focus:ring-opacity-50 items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none'>
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
          (selectedAssessment.note?.length ?? 0) > 0 && (
            <Badge
              style={{ justifySelf: 'center' }}
              className='bg-secondary flex w-fit rounded-[8px] px-[10px] py-[4px]'
            >
              <div className='text-xs text-white'>
                Estimated time: ~{selectedAssessment.note?.[0]?.text}
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
            {(selectedAssessment.contact ?? []).map((item, index) => (
              <div
                className='card mt-2 border-0 bg-[#F9F9F9] text-sm'
                key={index}
              >
                {item.name}
              </div>
            ))}
          </div>
        )}

      {selectedAssessment && (
        <DrawerFooter className='mt-2 flex flex-col p-0 py-4'>
          <Button
            onClick={() => {
              if (
                selectedAssessment?.resourceType === 'ResearchStudy' &&
                !researchUrl
              ) {
                return;
              }
              startTransition(() => {
                router.push(
                  `assessments/${
                    selectedAssessment?.resourceType === 'ResearchStudy'
                      ? researchUrl
                      : selectedAssessment?.id
                  }`
                );
              });
            }}
            className='bg-secondary h-full w-full rounded-xl p-4 text-white'
            disabled={
              isPending ||
              (selectedAssessment?.resourceType === 'ResearchStudy' &&
                !researchUrl)
            }
          >
            {isPending ? (
              <LoadingSpinnerIcon
                width={20}
                height={20}
                stroke='white'
                className='w-full animate-spin'
              />
            ) : selectedAssessment?.resourceType === 'ResearchStudy' ? (
              'Mulai'
            ) : (
              'Start Test'
            )}
          </Button>
          <DrawerClose className='focus:ring-opacity-50 items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none'>
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
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder='Search Assessment'
            className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
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

        {searchTerm ? (
          // When there's a search term, show search results
          // Priority: Local results > Server results > Loading > No results
          filteredAssessments.length > 0 ? (
            // Show local results
            <AssessmentSearchResults
              assessments={filteredAssessments}
              onResearchClick={handleResearchClick}
              onAssessmentClick={handleAssessmentClick}
            />
          ) : showServerResults && serverAssessments?.length > 0 ? (
            // Show server results when available and has data
            <AssessmentSearchResults
              assessments={serverAssessments}
              onResearchClick={handleResearchClick}
              onAssessmentClick={handleAssessmentClick}
            />
          ) : isServerSearching ? (
            // Show loading state
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='flex items-center gap-2'>
                <LoadingSpinnerIcon />
                <span className='text-muted'>
                  No results found, requesting more data to the server
                </span>
              </div>
            </div>
          ) : serverSearchCompleted ? (
            // Show no results message when server search completed but found nothing
            <EmptyState
              className='py-16'
              title='No results found'
              subtitle='Would you try another search term?'
            />
          ) : (
            // Show empty state
            <EmptyState
              className='py-16'
              title='No assessments found'
              subtitle='Try a different search term.'
            />
          )
        ) : (
          // No search term, show normal content
          <>
            {researchLoading || isAuthLoading ? (
              <div className='text-muted mt-4 mb-2 px-4'>
                <CardLoader item={2} />
              </div>
            ) : (
              filteredResearch(research).length > 0 && (
                <div className='text-muted mt-4 mb-2 px-4'>
                  <div className='text-[14px] font-bold'>On-going Research</div>
                  <div className='text-[10px]'>
                    Your heart is valuable. Please participate in our ongoing
                    study to help us help you more. We will send you the result
                    if you need to know.
                  </div>
                  <ScrollArea className='mt-2 w-full whitespace-nowrap'>
                    <div className='flex w-max space-x-4 pb-4'>
                      {filteredResearch(research).map(
                        (item: OngoingResearchItem) => {
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
                                  // NOTE: replace with this src later on
                                  // src={item.resource.relatedArtifact[0].resource}
                                  height={64}
                                  width={64}
                                  alt='clinic'
                                />
                                <div className='flex flex-col text-[12px]'>
                                  <div className='font-bold text-wrap text-black'>
                                    {item.resource.title}
                                  </div>
                                  <div
                                    className='text-wrap overflow-hidden leading-4'
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
                                  <div className='text-[10px]'>
                                    Research period:
                                  </div>
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
                                    className='bg-secondary cursor-pointer rounded-[32px] px-4 py-2 text-sm font-bold text-white'
                                    onClick={() => {
                                      handleResearchClick(
                                        item.resource,
                                        questionnaireId
                                      );
                                    }}
                                  >
                                    Participate
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <ScrollBar orientation='horizontal' />
                  </ScrollArea>
                </div>
              )
            )}

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
                        <div
                          key={assessment.resource.id}
                          className='card flex cursor-pointer flex-col gap-4 bg-white'
                          onClick={() => {
                            handleAssessmentClick(assessment.resource);
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
                                <AwardIcon
                                  size={16}
                                  color='white'
                                  fill='white'
                                />
                                <div className='text-[10px] text-white'>
                                  Best Impact
                                </div>
                              </Badge>
                              <Badge className='bg-secondary rounded-[8px] px-[10px] py-[4px]'>
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
                            <span className='text-muted mt-2 max-w-[250px] truncate overflow-hidden text-[10px] text-ellipsis'>
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
                  {(regularAssessments ?? []).map(
                    (assessment: BundleEntry<Questionnaire>) => (
                      <div
                        key={assessment.resource.id}
                        className='card item flex cursor-pointer flex-col p-2'
                        onClick={() => {
                          handleAssessmentClick(assessment.resource);
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
          </>
        )}
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
