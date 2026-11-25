'use client';

import { MOCK_RECOMMENDATIONS } from '@/constants/recommendations';
import type { Recommendation } from '@/types/recommendation';
import type { HomeRecommendationCard } from '@/utils/recommendation-card';
import { mapRecommendationToCard } from '@/utils/recommendation-card';
import type { ReactNode } from 'react';
import { useState } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react';
import RecommendationCard from './recommendation-card';

interface RecommendationCardStackProps {
  /**
   * Live BFF recommendations. Omitting falls back to mock cards for
   * guest/practitioner preview surfaces before live wiring.
   */
  recommendations?: Recommendation[];
  /** Navigates to booking for the tapped practitioner. */
  onBook: (practitionerRoleId: string, healthcareServiceId: string) => void;
  /**
   * Optional card rendered as the final slide, e.g. find-another prompt.
   * It has no booking click handler.
   */
  trailingCard?: ReactNode;
}

/**
 * Horizontal swipe stack of live recommendation cards.
 *
 * Renders nothing when the list is empty — the parent owns the empty state.
 *
 * @param props.recommendations - BFF recommendations to display
 * @param props.onBook - Fired with the practitioner id on card tap
 * @param props.trailingCard - Optional extra card appended as the last slide
 */
export default function RecommendationCardStack({
  recommendations,
  onBook,
  trailingCard
}: Readonly<RecommendationCardStackProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const cards: HomeRecommendationCard[] = recommendations
    ? recommendations.map(rec => mapRecommendationToCard(rec))
    : MOCK_RECOMMENDATIONS;

  if (cards.length === 0) return null;

  return (
    <div className='w-full'>
      <Swiper
        onSwiper={setSwiper}
        className='!overflow-visible'
        spaceBetween={16}
        slidesPerView={1.3}
        centeredSlides
        onSlideChange={swiper => setActiveIndex(swiper.activeIndex)}
      >
        {cards.map(card => (
          <SwiperSlide
            key={card.id}
            onClick={() =>
              onBook(card.practitionerRoleId, card.healthcareServiceId)
            }
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
        {trailingCard && (
          <SwiperSlide className='aspect-square !overflow-visible'>
            <div className='h-full'>{trailingCard}</div>
          </SwiperSlide>
        )}
      </Swiper>
      <div className='mt-2 flex items-center justify-center gap-2 pb-2'>
        {cards.map((card, index) => (
          <button
            key={card.id}
            type='button'
            onClick={() => swiper?.slideTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`cursor-pointer rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'bg-turquoise-deep h-[6px] w-6'
                : 'bg-border h-2 w-2'
            }`}
          />
        ))}
        {trailingCard && (
          <button
            key='trailing-card'
            type='button'
            onClick={() => swiper?.slideTo(cards.length)}
            aria-label={`Go to slide ${cards.length + 1}`}
            className={`cursor-pointer rounded-full transition-all duration-300 ${
              cards.length === activeIndex
                ? 'bg-turquoise-deep h-[6px] w-6'
                : 'bg-border h-2 w-2'
            }`}
          />
        )}
      </div>
    </div>
  );
}
