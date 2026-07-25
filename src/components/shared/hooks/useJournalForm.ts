'use client';

import { useCallback, useRef, useState } from 'react';

type JournalResponse = {
  readonly id: number;
  readonly text: string;
};

/**
 *
 */
export function useJournalForm(initialResponses = 0) {
  const nextId = useRef(initialResponses);
  const [response, setResponse] = useState<JournalResponse[]>(
    initialResponses > 0
      ? Array.from({ length: initialResponses }, (_, i) => ({
          id: i,
          text: ''
        }))
      : []
  );
  const [journalTitle, setJournalTitle] = useState('');

  /** Update the response text at the given index. */
  const handleResponseChange = (index: number, value: string) => {
    setResponse(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const addResponse = useCallback(() => {
    setResponse(prev => [...prev, { id: nextId.current++, text: '' }]);
  }, []);

  /** Remove the response at the given index. */
  const removeResponse = (index: number) => {
    setResponse(prev => prev.filter((_, i) => i !== index));
  };

  return {
    response,
    journalTitle,
    nextId,
    setJournalTitle,
    setResponse,
    handleResponseChange,
    addResponse,
    removeResponse
  };
}
