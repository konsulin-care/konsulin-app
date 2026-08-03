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
   * Center the active card in the viewport by scrolling the page.
   *
   * The card-stack-viewport grows with its content (no height constraint),
   * so overflow never occurs. Page-level scrollTo centers the card on screen.
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

    // Clear any leftover inline styles from previous centering strategies
    viewport.style.removeProperty('justify-content');
    viewport.style.removeProperty('padding-top');
    const fc = viewport.firstElementChild as HTMLElement | null;
    if (fc) fc.style.removeProperty('margin-top');

    // Scroll the page to center the active card vertically
    const cardRect = card.getBoundingClientRect();
    const cardCenterY = cardRect.top + cardRect.height / 2;
    const targetScrollY = window.scrollY + cardCenterY - window.innerHeight / 2;
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
  }, [activeCardIndex, focusableLinkIds]);

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
   * Make cards keyboard-accessible.
   * Non-active cards become tab stops with role="button"; the active card
   * gets tabIndex=-1 and no role (it is a form region, not a button). Future
   * cards blocked by a required unanswered card get aria-disabled.
   */
  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;

    const activeLinkId =
      activeCardIndex >= 0 && activeCardIndex < focusableLinkIds.length
        ? focusableLinkIds[activeCardIndex]
        : null;

    const activeBlocked =
      activeLinkId !== null &&
      isRequired(activeLinkId) &&
      !isAnswered(activeLinkId);

    viewport.querySelectorAll<HTMLElement>('[data-link-id]').forEach(card => {
      const cardLinkId = card.dataset.linkId ?? '';
      if (!focusableLinkIds.includes(cardLinkId)) return;

      if (cardLinkId === activeLinkId) {
        card.tabIndex = -1;
        card.removeAttribute('role');
        card.removeAttribute('aria-disabled');
        return;
      }

      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      const isFuture = focusableLinkIds.indexOf(cardLinkId) > activeCardIndex;
      if (isFuture && activeBlocked) {
        card.setAttribute('aria-disabled', 'true');
      } else {
        card.removeAttribute('aria-disabled');
      }
    });
  }, [activeCardIndex, focusableLinkIds, cardStates, isRequired, isAnswered]);

  /** Move keyboard focus to the card at the given index. */
  const focusCardByIndex = useCallback(
    (index: number) => {
      const viewport = containerRef.current;
      if (!viewport) return;
      const linkId = focusableLinkIds[index];
      if (!linkId) return;
      const card = viewport.querySelector<HTMLElement>(
        `[data-link-id="${CSS.escape(linkId)}"]`
      );
      card?.focus({ preventScroll: true });
    },
    [focusableLinkIds]
  );

  /**
   * Handle keyboard interaction on the card stack.
   * Only reacts when a card ([data-link-id]) has focus.
   * - Enter/Space: activate the focused card (same guard as click)
   * - ArrowDown/Right: next card; ArrowUp/Left: previous card
   */
  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const focused = document.activeElement as HTMLElement | null;
      const linkId = focused?.dataset.linkId;
      if (!linkId || !focusableLinkIds.includes(linkId)) return;

      switch (event.key) {
        case 'Enter':
        case ' ': {
          event.preventDefault();
          processCardClick(linkId, focused);
          break;
        }
        case 'ArrowDown':
        case 'ArrowRight': {
          event.preventDefault();
          focusCardByIndex(activeCardIndex + 1);
          handleNext();
          break;
        }
        case 'ArrowUp':
        case 'ArrowLeft': {
          event.preventDefault();
          focusCardByIndex(activeCardIndex - 1);
          handlePrevious();
          break;
        }
        default: {
          break;
        }
      }
    },
    [
      focusableLinkIds,
      processCardClick,
      activeCardIndex,
      handleNext,
      handlePrevious,
      focusCardByIndex
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
        onKeyDown={handleCardKeyDown}
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
