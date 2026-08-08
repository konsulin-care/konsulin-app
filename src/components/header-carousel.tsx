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
 * Alternates the upcoming session and research cards in a swipeable,
 * auto-rotating carousel of equal-height slides.
 *
 * - No cards render nothing; a single card renders statically without Swiper.
 * - Two cards render a Swiper that auto-advances every 5 seconds, pauses on
 *   hover, and keeps running after a manual swipe (disabled for users who
 *   prefer reduced motion).
 * - Slides stretch to the tallest card via the `.header-carousel .swiper-slide`
 *   flex rule in globals.css, so both cards render at equal height without any
 *   JS height measurement or inline container height.
 * - A card that self-hides (renders nothing) is excluded from the slide count;
 *   when only one card remains, the carousel degrades to static rendering.
 *   Wrappers stay mounted (hidden) even while no card has content yet, so
 *   late-loading session or research data is still detected (via a bounded
 *   MutationObserver on childList changes) and promotes to single or carousel
 *   mode. No ResizeObserver is used: presence is content-driven and the equal
 *   height comes from CSS, so there is no measurement feedback loop.
 */
export default function HeaderCarousel({
  session,
  research
}: Readonly<HeaderCarouselProps>) {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [present, setPresent] = useState<SlidePresence>({
    session: false,
    research: false
  });

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true,
    []
  );

  /** Refreshes card presence from rendered content, bailing out when unchanged. */
  const measure = useCallback(() => {
    const sessionWrapper = wrapperRefs.current[0];
    const researchWrapper = wrapperRefs.current[1];
    const next = {
      session: (sessionWrapper?.childElementCount ?? 0) > 0,
      research: (researchWrapper?.childElementCount ?? 0) > 0
    };
    setPresent(prev =>
      prev.session === next.session && prev.research === next.research
        ? prev
        : next
    );
  }, []);

  const setSessionRef = useCallback((element: HTMLDivElement | null) => {
    wrapperRefs.current[0] = element;
  }, []);
  const setResearchRef = useCallback((element: HTMLDivElement | null) => {
    wrapperRefs.current[1] = element;
  }, []);

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
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? undefined
        : new MutationObserver(measure);
    wrapperRefs.current.forEach(wrapper => {
      if (!wrapper) return;
      mutationObserver?.observe(wrapper, { childList: true });
    });
    return () => {
      mutationObserver?.disconnect();
    };
  }, [measure, mode]);

  const renderWrapper = (slot: number, node: ReactNode, hidden: boolean) => (
    <div
      key={slot}
      ref={slot === 0 ? setSessionRef : setResearchRef}
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

  if (slides.length === 0) return null;

  if (mode === 'single' || mode === 'none') {
    return (
      <div className='mt-4' data-testid='header-carousel'>
        {slides.map(slide =>
          renderWrapper(slide.slot, slide.node, !present[slide.key])
        )}
      </div>
    );
  }

  return (
    <Swiper
      className='header-carousel mt-4'
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
    >
      {slides.map(slide => (
        <SwiperSlide key={slide.key}>
          {renderWrapper(slide.slot, slide.node, false)}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
