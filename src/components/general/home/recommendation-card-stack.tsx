'use client';

import { MOCK_RECOMMENDATIONS } from '@/constants/recommendations';
import { useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';
import RecommendationCard from './recommendation-card';

interface RecommendationCardStackProps {
  onBook: (practitionerId: string) => void;
}

/**
 *
 */
export default function RecommendationCardStack({
  onBook
}: Readonly<RecommendationCardStackProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const cards = MOCK_RECOMMENDATIONS;

  return (
    <div className='w-full'>
      <Swiper
        onSwiper={setSwiper}
        className='!overflow-visible'
        spaceBetween={16}
        slidesPerView={1.3}
        centeredSlides={true}
        loop={true}
        onSlideChange={swiper => setActiveIndex(swiper.realIndex)}
      >
        {cards.map(card => (
          <SwiperSlide
            key={card.id}
            onClick={() => onBook(card.id)}
            className='aspect-square cursor-pointer !overflow-visible'
          >
            {({ isActive }) => (
              <div
                className='h-full transition-all duration-300'
                style={{
                  opacity: isActive ? 1 : 0.7
                }}
              >
                <RecommendationCard recommendation={card} />
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className='mt-2 flex items-center justify-center gap-2 pb-2'>
        {cards.map((card, index) => (
          <button
            key={card.id}
            type='button'
            onClick={() => swiper?.slideToLoop(index)}
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
