'use client';

import { useLayoutEffect, useRef } from 'react';

import { useQuestionFocus } from '@/hooks/useQuestionFocus';

interface CardDomMapperProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const RETRY_DELAYS = [50, 200, 800];
const MAX_RETRIES = 3;

/**
 * Maps focus state to DOM classes on question card containers.
 *
 * After the renderer populates the DOM, this component finds each card
 * container (by locating `[id="label-{linkId}"]` and walking up to
 * `.MuiGrid-root.MuiGrid-container`) and assigns CSS classes based on
 * the current focus state from `useQuestionFocus`.
 *
 * If the renderer's DOM nodes are not yet present on the first attempt,
 * retries up to 3 times with exponential backoff (50ms, 200ms, 800ms),
 * each preceded by requestAnimationFrame to align with the paint cycle.
 *
 * Uses a MutationObserver to re-apply classes when the renderer updates
 * the DOM (enableWhen, repeated items, etc.).
 */
export function CardDomMapper({ containerRef }: CardDomMapperProps) {
  const { cardStates, displayItemLinkIds, focusableLinkIds } =
    useQuestionFocus();

  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const attemptRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined; // eslint-disable-line unicorn/no-useless-undefined
    }

    function scheduleRetry() {
      if (attemptRef.current >= MAX_RETRIES) return;

      const delay = RETRY_DELAYS[attemptRef.current];
      attemptRef.current += 1;

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        rafRef.current = requestAnimationFrame(applyClasses);
      }, delay);
    }

    function applyClasses() {
      const labels = container.querySelectorAll<HTMLElement>('[id^="label-"]');

      if (labels.length === 0) {
        scheduleRetry();
        return;
      }

      // Labels found — reset retry counter
      attemptRef.current = 0;

      for (const label of labels) {
        const linkId = label.id.replace('label-', '');

        let el: HTMLElement | null = label;
        while (el && !el.classList.contains('MuiGrid-container')) {
          el = el.parentElement;
        }
        if (!el) continue;

        const isDisplay = displayItemLinkIds.includes(linkId);
        const state = cardStates[linkId];

        el.classList.remove(
          'card-question-container',
          'card-answered',
          'card-active',
          'card-future',
          'card-display-item'
        );

        el.dataset.linkId = linkId;

        if (isDisplay) {
          el.classList.add('card-display-item');
        } else if (focusableLinkIds.includes(linkId)) {
          el.classList.add('card-question-container');

          switch (state) {
            case 'answered': {
              el.classList.add('card-answered');
              break;
            }
            case 'active': {
              el.classList.add('card-active');
              break;
            }
            case 'future': {
              el.classList.add('card-future');
              break;
            }
            default: {
              break;
            }
          }
        }
      }
    }

    applyClasses();

    observerRef.current = new MutationObserver(() => {
      applyClasses();
    });

    observerRef.current.observe(container, {
      childList: true,
      subtree: true
    });

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      observerRef.current?.disconnect();
      observerRef.current = null;

      const containers = container.querySelectorAll<HTMLElement>(
        '.card-question-container, .card-display-item'
      );
      for (const card of containers) {
        card.classList.remove(
          'card-question-container',
          'card-answered',
          'card-active',
          'card-future',
          'card-display-item'
        );
        delete card.dataset.linkId;
      }
    };
  }, [containerRef, cardStates, displayItemLinkIds, focusableLinkIds]);

  return null;
}
