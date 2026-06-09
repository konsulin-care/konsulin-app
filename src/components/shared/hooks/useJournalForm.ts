'use client';

import { useRef, useState } from 'react';

type JournalResponse = {
  readonly id: number;
  readonly text: string;
};

/**
 *
 */
export function useJournalForm() {
  const nextId = useRef(0);
  const [response, setResponse] = useState<JournalResponse[]>([]);
  const [journalTitle, setJournalTitle] = useState('');

  const handleResponseChange = (index: number, value: string) => {
    setResponse(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const addResponse = () => {
    setResponse(prev => [...prev, { id: nextId.current++, text: '' }]);
  };

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
