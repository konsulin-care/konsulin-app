'use client';

import { useQuestionnaireResponseStore } from '@aehrc/smart-forms-renderer';
import { useCallback, useEffect, useState } from 'react';

/**
 *
 */
export function useRequiredValidation() {
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0);
  const invalidItems = useQuestionnaireResponseStore.use.invalidItems();

  const checkRequiredIsEmpty = useCallback(() => {
    const required = Object.values(invalidItems).flatMap(item =>
      item.issue
        .filter(issue => issue.code === 'required')
        .map(issue => ({
          expression: issue.expression[0],
          message: issue.details.text
        }))
    );
    setRequiredItemEmpty(required.length);
  }, [invalidItems]);

  useEffect(() => {
    if (Object.keys(invalidItems).length === 0) {
      setRequiredItemEmpty(0);
      return;
    }
    checkRequiredIsEmpty();
  }, [invalidItems, checkRequiredIsEmpty]);

  return { requiredItemEmpty, checkRequiredIsEmpty, invalidItems };
}
