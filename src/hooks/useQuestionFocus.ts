'use client';

import {
  useQuestionnaireResponseStore,
  useQuestionnaireStore
} from '@aehrc/smart-forms-renderer';
import type { QuestionnaireItem } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface QuestionFocusResult {
  activeCardIndex: number;
  setActiveCardIndex: (index: number) => void;
  totalFocusable: number;
  totalAnswerable: number;
  cardStates: Record<string, 'answered' | 'active' | 'future' | 'skipped'>;
  displayItemLinkIds: string[];
  focusableLinkIds: string[];
  isRequired: (linkId: string) => boolean;
  isAnswered: (linkId: string) => boolean;
}

/** Recursively collect all leaf items in document order. */
function flattenItems(
  items: QuestionnaireItem[] | undefined
): QuestionnaireItem[] {
  if (!items) return [];
  const result: QuestionnaireItem[] = [];
  for (const item of items) {
    if (item.type === 'group' && item.item) {
      result.push(...flattenItems(item.item));
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * Hook that subscribes to renderer stores and computes card stack state.
 *
 * Tracks which question card is active, which are answered, and which are
 * yet to come. Only required, non-readOnly items count as focusable.
 */
export function useQuestionFocus(): QuestionFocusResult {
  const sourceQuestionnaire = useQuestionnaireStore.use.sourceQuestionnaire();
  const itemMap = useQuestionnaireStore.use.itemMap();
  const updatableResponseItems =
    useQuestionnaireResponseStore.use.updatableResponseItems();

  const allLeafItems = useMemo(
    () => flattenItems(sourceQuestionnaire?.item),
    [sourceQuestionnaire]
  );

  const { displayItemLinkIds, focusableLinkIds, otherAnswerableLinkIds } =
    useMemo(() => {
      const display: string[] = [];
      const focusable: string[] = [];
      const other: string[] = [];

      for (const item of allLeafItems) {
        const props = itemMap[item.linkId];
        if (props?.type === 'display') {
          display.push(item.linkId);
        } else if (props?.type === 'group') {
          continue;
        } else if (props?.required && !props?.readOnly) {
          focusable.push(item.linkId);
        } else {
          other.push(item.linkId);
        }
      }

      return {
        displayItemLinkIds: display,
        focusableLinkIds: focusable,
        otherAnswerableLinkIds: other
      };
    }, [allLeafItems, itemMap]);

  /** Compute the first unanswered focusable index. */
  const firstUnansweredFocusIndex = useMemo(() => {
    for (const [i, linkId] of focusableLinkIds.entries()) {
      const responseItems = updatableResponseItems[linkId];
      const hasAns =
        responseItems?.some(
          (qri: { answer?: unknown[] }) =>
            Array.isArray(qri?.answer) && qri.answer.length > 0
        ) ?? false;
      if (!hasAns) return i;
    }
    return -1;
  }, [focusableLinkIds, updatableResponseItems]);

  const hasAnswer = useCallback(
    (linkId: string): boolean => {
      const responseItems = updatableResponseItems[linkId];
      return (
        responseItems?.some(
          (qri: { answer?: unknown[] }) =>
            Array.isArray(qri?.answer) && qri.answer.length > 0
        ) ?? false
      );
    },
    [updatableResponseItems]
  );

  const isRequired = useCallback(
    (linkId: string): boolean => {
      const props = itemMap[linkId];
      return props?.required === true && !props?.readOnly;
    },
    [itemMap]
  );

  /** Active card index. Initialized from first unanswered focusable. */
  const [activeCardIndex, setActiveCardIndex] = useState<number>(
    firstUnansweredFocusIndex
  );

  /** Track previous data-driven index to detect data changes for auto-advance. */
  const prevDataIndex = useRef<number>(firstUnansweredFocusIndex);

  /* Auto-advance when answer data changes */
  useEffect(() => {
    if (
      firstUnansweredFocusIndex >= 0 &&
      firstUnansweredFocusIndex !== prevDataIndex.current
    ) {
      prevDataIndex.current = firstUnansweredFocusIndex;
      setActiveCardIndex(firstUnansweredFocusIndex);
    }
    // Only re-run when data-driven index changes
  }, [firstUnansweredFocusIndex, setActiveCardIndex]);

  const cardStates = useMemo(() => {
    const states: Record<string, 'answered' | 'active' | 'future' | 'skipped'> =
      {};

    for (const [i, linkId] of focusableLinkIds.entries()) {
      if (hasAnswer(linkId)) {
        states[linkId] = 'answered';
      } else if (i === activeCardIndex) {
        states[linkId] = 'active';
      } else if (activeCardIndex >= 0 && i < activeCardIndex) {
        states[linkId] = 'skipped';
      } else {
        states[linkId] = 'future';
      }
    }

    for (const linkId of otherAnswerableLinkIds) {
      states[linkId] = hasAnswer(linkId) ? 'answered' : 'skipped';
    }

    return states;
  }, [focusableLinkIds, otherAnswerableLinkIds, activeCardIndex, hasAnswer]);

  const totalAnswerable = useMemo(
    () => focusableLinkIds.length + otherAnswerableLinkIds.length,
    [focusableLinkIds, otherAnswerableLinkIds]
  );

  return {
    activeCardIndex,
    setActiveCardIndex,
    totalFocusable: focusableLinkIds.length,
    totalAnswerable,
    cardStates,
    displayItemLinkIds,
    focusableLinkIds,
    isRequired,
    isAnswered: hasAnswer
  };
}
