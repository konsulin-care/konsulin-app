'use client';

import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { useEffect, useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';
import ResearcherStudySlide from './researcher-study-slide';

export interface ResearcherCarouselProps {
  studies: ResearchStudyWithBatches[];
  activeId: string;
  onSlideChange: (studyId: string) => void;
  onStudyClick: (studyId: string) => void;
}

/** Swiper carousel with one researcher study card per slide. */
export default function ResearcherCarousel({
  studies,
  activeId,
  onSlideChange,
  onStudyClick
}: Readonly<ResearcherCarouselProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const initialIndex = Math.max(
    0,
    studies.findIndex(study => study.study.id === activeId)
  );

  useEffect(() => {
    const index = studies.findIndex(study => study.study.id === activeId);
    if (swiper && index !== -1 && swiper.realIndex !== index) {
      swiper.slideTo(index);
    }
  }, [activeId, studies, swiper]);

  return (
    <div className='mt-4 w-full'>
      <Swiper
        onSwiper={setSwiper}
        className='researcher-carousel !overflow-visible'
        slidesPerView={1}
        spaceBetween={16}
        initialSlide={initialIndex}
        onSlideChange={current => {
          setActiveIndex(current.realIndex);
          const studyId = studies[current.realIndex]?.study.id;
          if (studyId) onSlideChange(studyId);
        }}
      >
        {studies.map(study => (
          <SwiperSlide key={study.study.id} className='!overflow-visible'>
            {({ isActive }) => (
              <ResearcherStudySlide
                study={study}
                isActive={isActive}
                onClick={onStudyClick}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className='mt-2 flex items-center justify-center gap-2 pb-2'>
        {studies.map((study, index) => (
          <button
            key={study.study.id}
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
