'use client';

import { useQuestionnaireStore } from '@aehrc/smart-forms-renderer';
import { useEffect, useInsertionEffect } from 'react';

import { useQuestionFocus } from '@/hooks/useQuestionFocus';

const FOCUS_STYLES = `
.question-card {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.question-card--active {
  transform: scale(1.04);
  z-index: 10;
  position: relative;
}
`;

/** Walk up from a label element to its containing .MuiGrid-container. */
function getCardContainer(labelId: string): HTMLElement | null {
  const label = document.querySelector<HTMLElement>(`#${labelId}`);
  if (label?.tagName !== 'LABEL') return null;
  let el = label.parentElement;
  while (el) {
    if (el.classList.contains('MuiGrid-container')) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Watches the renderer's questionnaire and response stores to determine
 * which question the participant should focus on (earliest unanswered),
 * then applies CSS classes for a gentle zoom effect on that question's card.
 *
 * Renders nothing — only injects a `<style>` element and toggles DOM classes.
 */
export function QuestionFocusTracker() {
  const { activeCardIndex, focusableLinkIds } = useQuestionFocus();
  const activeLinkId =
    activeCardIndex >= 0 && activeCardIndex < focusableLinkIds.length
      ? focusableLinkIds[activeCardIndex]
      : null;
  const currentPageIndex = useQuestionnaireStore.use.currentPageIndex();

  /* Inject focus styles once on mount */
  useInsertionEffect(() => {
    const style = document.createElement('style');
    style.textContent = FOCUS_STYLES;
    document.head.append(style);
    return () => {
      style.remove();
    };
  }, []);

  /* Track focus state: mark containers and toggle --active class */
  useEffect(() => {
    /* Add base class to any unmarked question containers */
    const labels = document.querySelectorAll<HTMLElement>('[id^="label-"]');
    labels.forEach(label => {
      if (label.tagName !== 'LABEL') return;
      const container = getCardContainer(label.id);
      if (container && !container.classList.contains('question-card')) {
        container.classList.add('question-card');
      }
    });

    /* Reset active class */
    document.querySelectorAll('.question-card--active').forEach(el => {
      el.classList.remove('question-card--active');
    });

    /* Apply active class to the focus question */
    if (activeLinkId) {
      const container = getCardContainer(`label-${activeLinkId}`);
      container?.classList.add('question-card--active');
    }

    return () => {
      document.querySelectorAll('.question-card').forEach(el => {
        el.classList.remove('question-card', 'question-card--active');
      });
    };
  }, [activeLinkId, currentPageIndex]);

  return null;
}
