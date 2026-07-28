'use client';

import { useCardSwipe } from '@/hooks/useCardSwipe';
import { useQuestionFocus } from '@/hooks/useQuestionFocus';
import { injectCardStyles } from '@/lib/injectCardStyles';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useInsertionEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { CardDomMapper } from './card-dom-mapper';

interface CardStackContainerProps {
  children?: ReactNode;
}

/**
 * Viewport container that wraps the renderer output and coordinates
 * the card stack, gestures, and navigation.
 *
 * Renders a flexbox viewport with scroll-snap alignment. Each question
 * card gets a CSS class based on its focus state (answered/active/future).
 * Display items are excluded from the stack.
 */
export function CardStackContainer({ children }: CardStackContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    activeCardIndex,
    setActiveCardIndex,
    totalFocusable,
    cardStates,
    focusableLinkIds,
    displayItemLinkIds,
    isRequired,
    isAnswered
  } = useQuestionFocus();

  const { swipeDirection, onTouchStart, onTouchMove, onTouchEnd } =
    useCardSwipe();

  /** Count answered focusable cards. */
  const answeredCount = focusableLinkIds.filter(
    id => cardStates[id] === 'answered'
  ).length;

  /** Navigate to a specific card index. */
  const goToCard = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalFocusable) return;
      setActiveCardIndex(index);
    },
    [setActiveCardIndex, totalFocusable]
  );

  /**
   * Center the active card in the viewport.
   *
   * When content overflows (long form), scroll the card into view center.
   * When content fits without overflow (short form), center the card group
   * via flexbox so the active card is near the viewport center.
   */
  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;

    if (activeCardIndex < 0 || activeCardIndex >= focusableLinkIds.length)
      return;
    const linkId = focusableLinkIds[activeCardIndex];
    if (!linkId) return;
    const card = viewport.querySelector(
      `[data-link-id="${CSS.escape(linkId)}"]`
    );
    if (!card) return;

    const overflows = viewport.scrollHeight > viewport.clientHeight;

    if (overflows) {
      viewport.style.justifyContent = '';
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      viewport.style.justifyContent = 'center';
    }
  }, [activeCardIndex, focusableLinkIds]);

  /** Monitor viewport size and reset inline justify-content when overflow starts. */
  useEffect(() => {
    const viewport = containerRef.current;
    let ro: ResizeObserver | undefined;

    if (viewport) {
      ro = new ResizeObserver(() => {
        if (viewport.scrollHeight > viewport.clientHeight) {
          viewport.style.justifyContent = '';
        }
      });
      ro.observe(viewport);
    }

    return () => {
      ro?.disconnect();
    };
  }, []);

  /** Handle swipe up — advance to next card. */
  const handleNext = useCallback(() => {
    const nextIndex = activeCardIndex + 1;
    if (nextIndex >= totalFocusable) return;
    goToCard(nextIndex);
  }, [activeCardIndex, totalFocusable, goToCard]);

  /** Handle swipe down — go to previous card. */
  const handlePrevious = useCallback(() => {
    const prevIndex = activeCardIndex - 1;
    if (prevIndex < 0) return;
    goToCard(prevIndex);
  }, [activeCardIndex, goToCard]);

  /** React to swipe direction changes. */
  useEffect(() => {
    if (swipeDirection === 'up') {
      handleNext();
    } else if (swipeDirection === 'down') {
      handlePrevious();
    }
  }, [swipeDirection, handleNext, handlePrevious]);

  /** Track origin for visit-and-return when clicking unanswered future cards. */
  const originIndexRef = useRef<number | null>(null);
  const returnLinkIdRef = useRef<string | null>(null);

  /**
   * Process a click on a focusable card.
   * - Past cards (index < active): direct navigation
   * - Future cards (index > active): blocked if current is required,
   *   else navigate + save origin for visit-and-return
   * - Active card: no-op
   */
  const processCardClick = useCallback(
    (linkId: string, target: HTMLElement) => {
      if (target.classList.contains('card-active')) {
        return;
      }

      const clickedIndex = focusableLinkIds.indexOf(linkId);

      if (clickedIndex < activeCardIndex) {
        goToCard(clickedIndex);
        return;
      }

      if (clickedIndex > activeCardIndex) {
        const currentLinkId = focusableLinkIds[activeCardIndex];
        if (
          currentLinkId &&
          isRequired(currentLinkId) &&
          !isAnswered(currentLinkId)
        ) {
          toast.error("Can't skip required question");
          return;
        }

        if (cardStates[linkId] !== 'answered') {
          originIndexRef.current = activeCardIndex;
          returnLinkIdRef.current = linkId;
        }
        goToCard(clickedIndex);
      }
    },
    [
      focusableLinkIds,
      activeCardIndex,
      goToCard,
      isRequired,
      isAnswered,
      cardStates
    ]
  );

  /**
   * Handle click on inactive cards.
   * Walks up from event.target to find an element with `data-link-id`.
   */
  const handleCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      let target = event.target as HTMLElement | null;
      while (target && target !== containerRef.current) {
        const linkId = target.dataset.linkId;
        if (linkId && focusableLinkIds.includes(linkId)) {
          processCardClick(linkId, target);
          break;
        }
        target = target.parentElement;
      }
    },
    [focusableLinkIds, processCardClick]
  );

  /** Visit-and-return: when the visited card becomes answered, return to origin. */
  useEffect(() => {
    if (
      returnLinkIdRef.current &&
      cardStates[returnLinkIdRef.current] === 'answered'
    ) {
      if (originIndexRef.current !== null) {
        goToCard(originIndexRef.current);
      }
      originIndexRef.current = null;
      returnLinkIdRef.current = null;
    }
  }, [cardStates, goToCard]);

  /** Inject dynamic card-stack styles into document head. */
  useInsertionEffect(() => {
    const activeLinkId =
      activeCardIndex >= 0 && activeCardIndex < focusableLinkIds.length
        ? focusableLinkIds[activeCardIndex]
        : null;

    const answeredLinkIds = focusableLinkIds.filter(
      id => cardStates[id] === 'answered'
    );
    const futureLinkIds = focusableLinkIds.filter(
      id => cardStates[id] === 'future'
    );

    return injectCardStyles({
      activeLinkId,
      answeredLinkIds,
      futureLinkIds,
      displayItemLinkIds
    });
  }, [activeCardIndex, focusableLinkIds, cardStates, displayItemLinkIds]);

  return (
    <div>
      <CardDomMapper containerRef={containerRef} />

      <div
        ref={containerRef}
        className='card-stack-viewport'
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      {/* Progress indicator */}
      <div className='mt-2 text-center text-sm text-gray-500'>
        Question {answeredCount + 1} of {totalFocusable}
      </div>
    </div>
  );
}

export default CardStackContainer;
