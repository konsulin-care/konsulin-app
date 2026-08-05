'use client';

import { useShareStudy } from '@/hooks/useShareStudy';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';
import {
  BatchProgress,
  buildOverlapMap,
  QuestionnaireList,
  TimelineStrip,
  truncateDescription
} from './study-sections';

interface ResearchCarouselProps {
  studies: StudyProgress[];
  activeId: string;
  onSlideChange: (studyId: string) => void;
  onStudyClick: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  isPatient: boolean;
  fhirId?: string;
}

/** Icon, title, and description block of a study slide. */
function StudyHeader({ study }: Readonly<{ study: StudyProgress['study'] }>) {
  return (
    <div className='flex items-start gap-2'>
      <FlaskConical className='mt-0.5 h-5 w-5 shrink-0 text-black' />
      <div className='flex min-w-0 flex-col'>
        <h3 className='text-sm font-bold text-black'>{study.title}</h3>
        <p className='text-[11px] leading-4 text-gray-500'>
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
  onStudyClick,
  onQuestionnaireClick
}: Readonly<{
  progress: StudyProgress;
  isActive: boolean;
  isPatient: boolean;
  fhirId?: string;
  overlapMap: Map<string, string[]>;
  onStudyClick: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
}>) {
  const { handleShare, copied } = useShareStudy({
    studyId: progress.study.id,
    isPatient,
    fhirId
  });

  return (
    <div
      data-testid={`research-slide-${progress.study.id}`}
      data-active={isActive}
      onClick={() => onStudyClick(progress.study.id)}
      className={`card border-softGray flex h-full cursor-pointer flex-col gap-2 bg-white p-4 transition-all duration-300 ${
        isActive ? 'opacity-100' : 'opacity-70'
      }`}
    >
      <StudyHeader study={progress.study} />
      <BatchProgress progress={progress} />
      {progress.isComplete && (
        <div className='rounded-xl bg-green-50 px-4 py-2 text-center text-xs font-bold text-green-700'>
          You&apos;ve completed this batch. Next batch opens soon!
        </div>
      )}
      <TimelineStrip progress={progress} />
      <QuestionnaireList
        progress={progress}
        overlapMap={overlapMap}
        onQuestionnaireClick={onQuestionnaireClick}
      />
      <button
        type='button'
        data-testid={`research-share-${progress.study.id}`}
        onClick={e => {
          e.stopPropagation();
          void handleShare();
        }}
        className='mt-auto flex cursor-pointer items-center justify-center gap-1.5 border-t border-gray-100 pt-2 text-center text-[10px] text-black'
      >
        <Share2 className='h-3 w-3' />
        {copied ? 'Link copied!' : 'Tap to share this survey'}
      </button>
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
  fhirId
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
    <div className='w-full'>
      <Swiper
        onSwiper={setSwiper}
        className='research-carousel !overflow-visible'
        slidesPerView={1}
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
                ? 'h-[6px] w-6 bg-[#0abdc3]'
                : 'h-2 w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
