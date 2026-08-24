'use client';

import { useEffect, useRef } from 'react';

import { useQuestionFocus } from '@/hooks/useQuestionFocus';

interface CardDomMapperProps {
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Maps focus state to DOM classes on question card containers.
 *
 * Finds each card container by locating `[id^="label-{linkId}"]` and
 * walking up to `.MuiGrid-root.MuiGrid-container`, then assigns CSS
 * classes based on the current focus state from `useQuestionFocus`.
 *
 * Uses a MutationObserver to re-apply classes when the renderer updates
 * the DOM (enableWhen, repeated items, etc.).
 */
export function CardDomMapper({ containerRef }: CardDomMapperProps) {
  const { cardStates, displayItemLinkIds, focusableLinkIds } =
    useQuestionFocus();

  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined; // eslint-disable-line unicorn/no-useless-undefined
    }

    /** Applies the active/inactive classes to the focus question labels. */
    function applyClasses() {
      const labels = container.querySelectorAll<HTMLElement>('[id^="label-"]');

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
