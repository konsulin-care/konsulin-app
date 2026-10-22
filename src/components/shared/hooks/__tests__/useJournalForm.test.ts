import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useJournalForm } from '../useJournalForm';

describe('useJournalForm', () => {
  it('starts with empty response array by default', () => {
    const { result } = renderHook(() => useJournalForm());
    expect(result.current.response).toEqual([]);
  });

  it('starts with initialResponses items when param is provided', () => {
    const { result } = renderHook(() => useJournalForm(1));
    expect(result.current.response).toHaveLength(1);
    expect(result.current.response[0]).toEqual({ id: 0, text: '' });
  });

  it('starts with N items when initialResponses is N', () => {
    const { result } = renderHook(() => useJournalForm(3));
    expect(result.current.response).toHaveLength(3);
    expect(result.current.response[0]).toEqual({ id: 0, text: '' });
    expect(result.current.response[1]).toEqual({ id: 1, text: '' });
    expect(result.current.response[2]).toEqual({ id: 2, text: '' });
  });

  it('addResponse adds a new item with incrementing id', () => {
    const { result } = renderHook(() => useJournalForm(1));
    expect(result.current.response).toHaveLength(1);

    act(() => {
      result.current.addResponse();
    });

    expect(result.current.response).toHaveLength(2);
    expect(result.current.response[1]).toEqual({ id: 1, text: '' });
  });

  it('removeResponse removes item at given index', () => {
    const { result } = renderHook(() => useJournalForm(2));
    expect(result.current.response).toHaveLength(2);

    act(() => {
      result.current.removeResponse(0);
    });

    expect(result.current.response).toHaveLength(1);
    expect(result.current.response[0]).toEqual({ id: 1, text: '' });
  });

  it('handleResponseChange updates text at given index', () => {
    const { result } = renderHook(() => useJournalForm(1));

    act(() => {
      result.current.handleResponseChange(0, 'new text');
    });

    expect(result.current.response[0].text).toBe('new text');
  });

  it('nextId.current continues correctly after initialResponses', () => {
    const { result } = renderHook(() => useJournalForm(2));
    expect(result.current.nextId.current).toBe(2);

    act(() => {
      result.current.addResponse();
    });

    expect(result.current.response).toHaveLength(3);
    expect(result.current.response[2]).toEqual({ id: 2, text: '' });
    expect(result.current.nextId.current).toBe(3);
  });
});
