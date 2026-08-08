'use client';

import type { ReactNode } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import 'swiper/css';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

/** Delay between automatic card switches. */
const AUTOPLAY_DELAY_MS = 5000;

interface HeaderCarouselProps {
  /** Upcoming session card node; passed only when session data exists. */
  session?: ReactNode;
  /** Research progress card node; may self-hide while its data loads. */
  research?: ReactNode;
}

interface SlidePresence {
  session: boolean;
  research: boolean;
}

interface CarouselSlide {
  /** Stable slide key for React reconciliation. */
  key: 'session' | 'research';
  /** Wrapper ref slot: 0 for session, 1 for research. */
  slot: number;
  node: ReactNode;
}

/**
 * Resolves the tallest measured slide height, ignoring empty slides.
 *
 * @param heights - Measured height per slide; 0 marks an empty slide.
 * @returns The maximum height, or undefined when no slide has content.
 */
export function resolveCarouselHeight(heights: number[]): number | undefined {
  const present = heights.filter(height => height > 0);
  if (present.length === 0) return undefined;
  return Math.max(...present);
}

/**
 * Alternates the upcoming session and research cards in a swipeable,
 * auto-rotating carousel of equal-height slides.
 *
 * - No cards render nothing; a single card renders statically without Swiper.
 * - Two cards render a Swiper that auto-advances every 5 seconds, pauses on
 *   hover, and keeps running after a manual swipe (disabled for users who
 *   prefer reduced motion).
 * - Slide heights are measured after render and the tallest one sizes the
 *   container, so both cards stretch to the same height.
 * - A card that self-hides (renders nothing) is excluded from the slide count;
 *   when only one card remains, the carousel degrades to static rendering.
 *   Non-present cards stay mounted but hidden, so late-loading research data
 *   is still detected (via MutationObserver) and promotes to carousel mode.
 */
export default function HeaderCarousel({
  session,
  research
}: Readonly<HeaderCarouselProps>) {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slideHeights, setSlideHeights] = useState<number[]>([]);
  const [present, setPresent] = useState<SlidePresence>({
    session: session !== undefined,
    research: false
  });

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true,
    []
  );

  /** Reads wrapper heights and rendered content to refresh slide presence. */
  const measure = useCallback(() => {
    const heights = wrapperRefs.current.map(
      wrapper => wrapper?.scrollHeight ?? 0
    );
    setSlideHeights(heights);
    const sessionWrapper = wrapperRefs.current[0];
    const researchWrapper = wrapperRefs.current[1];
    setPresent({
      session: (sessionWrapper?.childElementCount ?? 0) > 0,
      research: (researchWrapper?.childElementCount ?? 0) > 0
    });
  }, []);

  const setWrapperRef = (index: number) => (element: HTMLDivElement | null) => {
    wrapperRefs.current[index] = element;
  };

  const cardCount = (present.session ? 1 : 0) + (present.research ? 1 : 0);
  let mode: 'carousel' | 'single' | 'none';
  if (cardCount >= 2) {
    mode = 'carousel';
  } else if (cardCount === 1) {
    mode = 'single';
  } else {
    mode = 'none';
  }

  useLayoutEffect(() => {
    measure();
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure);
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? undefined
        : new MutationObserver(measure);
    wrapperRefs.current.forEach(wrapper => {
      if (!wrapper) return;
      resizeObserver?.observe(wrapper);
      mutationObserver?.observe(wrapper, { childList: true });
    });
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [measure, mode]);

  const renderWrapper = (slot: number, node: ReactNode, hidden: boolean) => (
    <div
      key={slot}
      ref={setWrapperRef(slot)}
      className={hidden ? 'hidden' : 'h-full'}
    >
      {node}
    </div>
  );

  const slides: CarouselSlide[] = [];
  if (session !== undefined) {
    slides.push({ key: 'session', slot: 0, node: session });
  }
  if (research !== undefined) {
    slides.push({ key: 'research', slot: 1, node: research });
  }

  if (mode === 'none') return null;

  if (mode === 'single') {
    return (
      <div className='mt-4' data-testid='header-carousel'>
        {slides.map(slide =>
          renderWrapper(slide.slot, slide.node, !present[slide.key])
        )}
      </div>
    );
  }

  const containerHeight = resolveCarouselHeight(slideHeights);
  const containerStyle = containerHeight
    ? { height: containerHeight }
    : undefined;

  return (
    <Swiper
      className='mt-4'
      data-testid='header-carousel'
      modules={[Autoplay]}
      slidesPerView={1}
      spaceBetween={0}
      rewind
      autoplay={
        prefersReducedMotion
          ? false
          : {
              delay: AUTOPLAY_DELAY_MS,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }
      }
      style={containerStyle}
    >
      {slides.map(slide => (
        <SwiperSlide key={slide.key}>
          {renderWrapper(slide.slot, slide.node, false)}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
