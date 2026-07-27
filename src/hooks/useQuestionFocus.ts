'use client';

import {
  useQuestionnaireResponseStore,
  useQuestionnaireStore
} from '@aehrc/smart-forms-renderer';
import type { QuestionnaireItem } from 'fhir/r4';
import { useMemo } from 'react';

export interface QuestionFocusResult {
  activeLinkId: string | null;
  answeredCount: number;
  totalCount: number;
  linkIds: string[];
}

function isAnswerable(item: QuestionnaireItem): boolean {
  if (item.type === 'display') return false;
  if (item.type === 'group') return false;
  if (item.readOnly) return false;
  return true;
}

/** Recursively collect leaf-level answerable questionnaire items. */
function collectAnswerableItems(
  items: QuestionnaireItem[] | undefined
): QuestionnaireItem[] {
  if (!items) return [];
  const result: QuestionnaireItem[] = [];
  for (const item of items) {
    if (item.type === 'group' && item.item) {
      result.push(...collectAnswerableItems(item.item));
    } else if (isAnswerable(item)) {
      result.push(item);
    }
  }
  return result;
}

/**
 * Hook that subscribes to the renderer's stores and computes which question
 * the participant should focus on — the earliest unanswered leaf-level item.
 *
 * Skips `display`, `group`, and `readOnly` items.
 *
 * @returns `activeLinkId` (null when all answered), answer counts, and ordered link IDs
 */
export function useQuestionFocus(): QuestionFocusResult {
  const sourceQuestionnaire = useQuestionnaireStore.use.sourceQuestionnaire();
  const updatableResponseItems =
    useQuestionnaireResponseStore.use.updatableResponseItems();

  const answerableItems = useMemo(
    () => collectAnswerableItems(sourceQuestionnaire?.item),
    [sourceQuestionnaire]
  );

  const linkIds = useMemo(
    () => answerableItems.map(item => item.linkId),
    [answerableItems]
  );

  return useMemo(() => {
    let answeredCount = 0;
    let activeLinkId: string | null = null;

    for (const item of answerableItems) {
      const responseItems = updatableResponseItems[item.linkId];
      const hasAnswer =
        responseItems?.some(qri => qri.answer && qri.answer.length > 0) ??
        false;

      if (hasAnswer) {
        answeredCount++;
      } else if (activeLinkId === null) {
        activeLinkId = item.linkId;
      }
    }

    return {
      activeLinkId,
      answeredCount,
      totalCount: answerableItems.length,
      linkIds
    };
  }, [answerableItems, updatableResponseItems, linkIds]);
}
