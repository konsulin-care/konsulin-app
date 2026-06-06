'use client';

/* eslint-disable sonarjs/cognitive-complexity, max-lines */

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import {
  searchQuestionnaires,
  useOngoingResearch,
  usePopularAssessments,
  useRegularAssessments
} from '@/services/api/assessment';
import { BundleEntry, Questionnaire, ResearchStudy } from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition
} from 'react';

import AssessmentDrawerContent from './assessment-drawer';
import BrowseInstrumentsSection from './browse-instruments-section';
import PopularAssessmentsSection from './popular-assessments-section';
import ResearchSection from './research-section';

const isResearchStudy = (assessment: BundleEntry): boolean => {
  return assessment.resource.resourceType === 'ResearchStudy';
};

const isQuestionnaire = (assessment: BundleEntry): boolean => {
  return assessment.resource.resourceType === 'Questionnaire';
};

export default function AssessmentsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const baseUrl =
    typeof window !== 'undefined' ? globalThis.window.location.origin : '';
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

  const QuestionnaireAssessmentCard = ({ assessment, onClick }) => {
    return (
      <div
        role='button'
        tabIndex={0}
        className='flex cursor-pointer flex-col gap-4'
        onClick={() => onClick(assessment.resource)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick(assessment.resource);
        }}
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

  const searchAssessments = useMemo(() => {
    return [
      ...(popularAssessments || []),
      ...(regularAssessments || [])
    ].filter(
      (assessment: BundleEntry) =>
        assessment.resource.resourceType === 'Questionnaire'
    );
  }, [popularAssessments, regularAssessments]);

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

  const findAssessmentById = useCallback(
    (id: string) => {
      const allRegular = [
        ...(popularAssessments || []),
        ...(regularAssessments || [])
      ];

      const regularFound = allRegular.find(item => item.resource.id === id);
      if (regularFound) return regularFound.resource;

      const researchFound = research?.find(item => item.resource.id === id);
      if (researchFound) return researchFound.resource;

      return null;
    },
    [popularAssessments, regularAssessments, research]
  );

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

    const params = new URLSearchParams(globalThis.window.location.search);
    const fullUrl = `${baseUrl}${pathname}?${params.toString()}`;
    setCurrentLocation(fullUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDrawerOpenParam,
    assessmentIdParam,
    research,
    popularAssessments,
    regularAssessments,
    findAssessmentById
  ]);

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

    const params = new URLSearchParams(globalThis.window.location.search);
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', study.id);

    setIsOpen(true);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleAssessmentClick = (assessment: Questionnaire) => {
    if (!assessment) return;

    const params = new URLSearchParams(globalThis.window.location.search);
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

    const params = new URLSearchParams(globalThis.window.location.search);
    params.delete('isDrawerOpen');
    params.delete('assessmentId');

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <PageHeader />

      <ContentWraper className='pt-4'>
        <div className='flex gap-4 px-4'>
          <InputWithIcon
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder='Search Assessment'
            className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
        </div>

        {searchTerm ? (
          filteredAssessments.length > 0 ? (
            <AssessmentSearchResults
              assessments={filteredAssessments}
              onResearchClick={handleResearchClick}
              onAssessmentClick={handleAssessmentClick}
            />
          ) : showServerResults && serverAssessments?.length > 0 ? (
            <AssessmentSearchResults
              assessments={serverAssessments}
              onResearchClick={handleResearchClick}
              onAssessmentClick={handleAssessmentClick}
            />
          ) : isServerSearching ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='flex items-center gap-2'>
                <LoadingSpinnerIcon />
                <span className='text-muted'>
                  No results found, requesting more data to the server
                </span>
              </div>
            </div>
          ) : serverSearchCompleted ? (
            <EmptyState
              className='py-16'
              title='No results found'
              subtitle='Would you try another search term?'
            />
          ) : (
            <EmptyState
              className='py-16'
              title='No assessments found'
              subtitle='Try a different search term.'
            />
          )
        ) : (
          <>
            <ResearchSection
              research={research}
              researchLoading={researchLoading}
              isAuthLoading={isAuthLoading}
              onResearchClick={handleResearchClick}
            />

            <PopularAssessmentsSection
              popularAssessments={popularAssessments}
              popularLoading={popularLoading}
              isAuthLoading={isAuthLoading}
              onAssessmentClick={handleAssessmentClick}
            />

            <BrowseInstrumentsSection
              regularAssessments={regularAssessments}
              regularLoading={regularLoading}
              isAuthLoading={isAuthLoading}
              onAssessmentClick={handleAssessmentClick}
            />
          </>
        )}
      </ContentWraper>

      <Drawer onClose={handleDrawerClose} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          <AssessmentDrawerContent
            selectedAssessment={selectedAssessment}
            researchUrl={researchUrl}
            currentLocation={currentLocation}
            isPending={isPending}
            isPractitioner={isPractitioner}
            onClose={handleDrawerClose}
            startTransition={startTransition}
            router={router}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
