'use client';

import { useShareStudy } from '@/hooks/useShareStudy';
import type { StudyProgress } from '@/utils/fhir/research';
import { daysUntilBatch } from '@/utils/fhir/research';
import {
  Check,
  CheckCircle2,
  Circle,
  FlaskConical,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';

interface ResearchCarouselProps {
  studies: StudyProgress[];
  activeId: string;
  onSlideChange: (studyId: string) => void;
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
          {study.description}
        </p>
      </div>
    </div>
  );
}

/** Current batch index, closing deadline, progress bar, and counts. */
function BatchProgress({ progress }: Readonly<{ progress: StudyProgress }>) {
  const { currentBatch } = progress;
  if (!currentBatch) return null;

  const completedPercent =
    progress.totalCount === 0
      ? 0
      : (progress.completedCount / progress.totalCount) * 100;

  return (
    <div className='flex flex-col gap-1 text-[11px] text-gray-600'>
      <div className='flex items-center justify-between'>
        <span className='font-bold text-black'>
          Batch {progress.batches.indexOf(currentBatch) + 1}
        </span>
        <span>Closes in {daysUntilBatch(currentBatch.end)} days</span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-200'>
        <div
          className='h-full rounded-full bg-[#13c2c2]'
          style={{ width: `${completedPercent}%` }}
        />
      </div>
      <div className='flex items-center justify-between'>
        <span>
          {progress.completedCount}/{progress.totalCount} questionnaires
        </span>
        {progress.isComplete && (
          <span className='font-bold text-green-600'>Batch complete</span>
        )}
      </div>
    </div>
  );
}

/** Horizontal strip of batch chips for a single study. */
function TimelineStrip({ progress }: Readonly<{ progress: StudyProgress }>) {
  const noun = progress.consecutiveBatches === 1 ? 'batch' : 'batches';
  return (
    <div>
      <div className='flex items-center gap-2'>
        {progress.history.map((entry, index) => {
          const isCurrent = progress.currentBatch?.id === entry.batchId;
          const isDone = entry.participated && !isCurrent;

          let chipClass = 'bg-gray-100 text-black font-bold opacity-50';
          let content: React.ReactNode = `B${index + 1}`;
          if (isCurrent) {
            chipClass = 'bg-gray-100 text-black font-bold';
          } else if (isDone) {
            chipClass = 'bg-secondary text-white';
            content = <Check className='h-4 w-4' />;
          }

          return (
            <div
              key={entry.batchId}
              data-testid={`batch-chip-${entry.batchId}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${chipClass}`}
            >
              {content}
            </div>
          );
        })}
      </div>
      <p className='mt-2 text-[11px] text-gray-500'>
        You&apos;ve completed {progress.consecutiveBatches} {noun} in a row.
      </p>
    </div>
  );
}

/** Maps a questionnaire id to a readable display name. */
function displayName(id: string): string {
  return id
    .split('-')
    .map(part => part.toUpperCase())
    .join(' ');
}

/** Questionnaire list for one study with done states and overlap hints. */
function QuestionnaireList({
  progress,
  overlapMap
}: Readonly<{
  progress: StudyProgress;
  overlapMap: Map<string, string[]>;
}>) {
  const batch = progress.currentBatch;
  if (!batch) return null;

  const completed = new Set(progress.completedQuestionnaireIds);
  const studyTitle = progress.study.title ?? progress.study.id;

  return (
    <ul className='flex flex-col gap-2'>
      {batch.questionnaireIds.map(id => {
        const done = completed.has(id);
        const otherStudies = (overlapMap.get(id) ?? []).filter(
          title => title !== studyTitle
        );
        return (
          <li key={id} className='flex items-start gap-2 text-xs'>
            {done ? (
              <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-[#13c2c2]' />
            ) : (
              <Circle className='mt-0.5 h-4 w-4 shrink-0 text-gray-300' />
            )}
            <div className='flex flex-col'>
              <Link
                href={`/assessments?id=${id}`}
                className='font-bold text-gray-800 hover:underline'
              >
                {displayName(id)}
              </Link>
              {otherStudies.length > 0 && (
                <span className='text-[10px] text-gray-500'>
                  Also counts toward {otherStudies.join(', ')}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** One carousel slide: full study project with a bottom share bar. */
function StudySlide({
  progress,
  isActive,
  isPatient,
  fhirId,
  overlapMap
}: Readonly<{
  progress: StudyProgress;
  isActive: boolean;
  isPatient: boolean;
  fhirId?: string;
  overlapMap: Map<string, string[]>;
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
      className={`card border-softGray flex h-full flex-col gap-2 bg-white p-4 transition-all duration-300 ${
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
      <QuestionnaireList progress={progress} overlapMap={overlapMap} />
      <button
        type='button'
        data-testid={`research-share-${progress.study.id}`}
        onClick={() => {
          void handleShare();
        }}
        className='mt-auto flex cursor-pointer items-center justify-center gap-1.5 border-t border-gray-100 pt-2 text-center text-[10px] text-gray-400'
      >
        <Share2 className='h-3 w-3' />
        {copied ? 'Link copied!' : 'Tap to share this survey'}
      </button>
    </div>
  );
}

/** Maps each questionnaire to every study title that deploys it. */
function buildOverlapMap(studies: StudyProgress[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const study of studies) {
    for (const id of study.currentBatch?.questionnaireIds ?? []) {
      const titles = map.get(id) ?? [];
      titles.push(study.study.title ?? study.study.id);
      map.set(id, titles);
    }
  }
  return map;
}

/** Swiper carousel with one study project per slide. */
export default function ResearchCarousel({
  studies,
  activeId,
  onSlideChange,
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
        className='!overflow-visible'
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
