'use client';

import ShareResearchButton from '@/components/research/share-research-button';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import {
  waitingBatchIds,
  type WaitingResponse
} from '@/utils/fhir/research-schedule';
import { FlaskConical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';
import BatchTrail from './batch-trail';
import { CollectiveGoal } from './collective-goal';
import {
  BatchProgress,
  buildOverlapMap,
  QuestionnaireList,
  truncateDescription
} from './study-sections';

/** Stable empty consent set so slides share one instance. */
const EMPTY_CONSENTED_IDS: ReadonlySet<string> = new Set<string>();

interface ResearchCarouselProps {
  studies: StudyProgress[];
  activeId: string;
  onSlideChange: (studyId: string) => void;
  onStudyClick: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  isPatient: boolean;
  fhirId?: string;
  /** Resolved id → questionnaire info map (title + estimated duration). */
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
  /** True while questionnaire titles are being fetched. */
  isTitlesLoading?: boolean;
  /** Queued responses awaiting sync, used to mark waiting batches. */
  waiting?: readonly WaitingResponse[];
  /** Study ids the patient has consented to, for the collective goal. */
  consentedStudyIds?: ReadonlySet<string>;
}

/** Icon, title, and description block of a study slide. */
function StudyHeader({ study }: Readonly<{ study: StudyProgress['study'] }>) {
  return (
    <div className='flex items-start gap-2'>
      <FlaskConical className='text-foreground mt-0.5 h-5 w-5 shrink-0' />
      <div className='flex min-w-0 flex-col'>
        <h3 className='text-foreground text-sm font-bold'>{study.title}</h3>
        <p className='text-muted-foreground text-xs leading-4'>
          {truncateDescription(study.description)}
        </p>
      </div>
    </div>
  );
}

/** One carousel slide: full study project with a bottom share bar. */
function StudySlide({
  progress,
  isActive,
  isPatient,
  fhirId,
  overlapMap,
  titleMap,
  isTitlesLoading,
  waiting,
  consentedStudyIds,
  onStudyClick,
  onQuestionnaireClick
}: Readonly<{
  progress: StudyProgress;
  isActive: boolean;
  isPatient: boolean;
  fhirId?: string;
  overlapMap: Map<string, string[]>;
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
  isTitlesLoading?: boolean;
  waiting: readonly WaitingResponse[];
  consentedStudyIds: ReadonlySet<string>;
  onStudyClick: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
}>) {
  const waitingIds = waitingBatchIds(progress.batches, waiting);

  return (
    <div
      data-testid={`research-slide-${progress.study.id}`}
      data-active={isActive}
      className={`card border-border focus-within:ring-secondary bg-card relative flex h-full flex-col gap-2 p-4 transition-all duration-300 focus-within:ring-2 ${
        isActive ? 'opacity-100' : 'opacity-70'
      }`}
    >
      <button
        type='button'
        aria-label={`Open study ${progress.study.title}`}
        onClick={() => {
          onStudyClick(progress.study.id);
        }}
        className='absolute inset-0 z-0 cursor-pointer'
      />
      <div className='pointer-events-none relative z-10 flex flex-col gap-2'>
        <StudyHeader study={progress.study} />
        <BatchProgress progress={progress} />
        <CollectiveGoal
          study={progress.study}
          isGuest={!isPatient}
          isConsented={consentedStudyIds.has(progress.study.id)}
        />
        <BatchTrail progress={progress} waitingBatchIds={waitingIds} />
        <QuestionnaireList
          progress={progress}
          overlapMap={overlapMap}
          onQuestionnaireClick={onQuestionnaireClick}
          titleMap={titleMap}
          isTitlesLoading={isTitlesLoading}
          showOverlapHints={false}
        />
        <ShareResearchButton
          title={progress.study.title}
          isPatient={isPatient}
          fhirId={fhirId}
          studyId={progress.study.id}
          dataTestId={`research-share-${progress.study.id}`}
          className='border-border text-foreground pointer-events-auto mt-auto flex cursor-pointer items-center justify-center gap-1.5 border-t pt-2 text-xs'
        />
      </div>
    </div>
  );
}

/** Swiper carousel with one study project per slide. */
export default function ResearchCarousel({
  studies,
  activeId,
  onSlideChange,
  onStudyClick,
  onQuestionnaireClick,
  isPatient,
  fhirId,
  titleMap,
  isTitlesLoading,
  waiting = [],
  consentedStudyIds = EMPTY_CONSENTED_IDS
}: Readonly<ResearchCarouselProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const overlapMap = useMemo(() => buildOverlapMap(studies), [studies]);
  const initialIndex = Math.max(
    0,
    studies.findIndex(progress => progress.study.id === activeId)
  );

  useEffect(() => {
    const index = studies.findIndex(progress => progress.study.id === activeId);
    if (swiper && index !== -1 && swiper.realIndex !== index) {
      swiper.slideTo(index);
    }
  }, [activeId, studies, swiper]);

  return (
    <div className='mt-4 w-full'>
      <Swiper
        onSwiper={setSwiper}
        className='research-carousel !overflow-visible'
        slidesPerView={1}
        spaceBetween={16}
        initialSlide={initialIndex}
        onSlideChange={current => {
          setActiveIndex(current.realIndex);
          const studyId = studies[current.realIndex]?.study.id;
          if (studyId) onSlideChange(studyId);
        }}
      >
        {studies.map(progress => (
          <SwiperSlide key={progress.study.id} className='!overflow-visible'>
            {({ isActive }) => (
              <StudySlide
                progress={progress}
                isActive={isActive}
                isPatient={isPatient}
                fhirId={fhirId}
                overlapMap={overlapMap}
                titleMap={titleMap}
                isTitlesLoading={isTitlesLoading}
                waiting={waiting}
                consentedStudyIds={consentedStudyIds}
                onStudyClick={onStudyClick}
                onQuestionnaireClick={onQuestionnaireClick}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className='mt-2 flex items-center justify-center gap-2 pb-2'>
        {studies.map((progress, index) => (
          <button
            key={progress.study.id}
            type='button'
            onClick={() => swiper?.slideTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`cursor-pointer rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'bg-turquoise-deep h-[6px] w-6'
                : 'bg-muted h-2 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
