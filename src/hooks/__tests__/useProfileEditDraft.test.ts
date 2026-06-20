import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileEditDraft } from '../useProfileEditDraft';
import { assertDefined } from '@/utils/__tests__/test-utils';

const STORAGE_PREFIX = 'profile-edit-draft-';

describe('useProfileEditDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads draft for the initial fhirId', async () => {
    const draft = { name: 'John', email: 'john@test.com' };
    localStorage.setItem(`${STORAGE_PREFIX}patient-1`, JSON.stringify(draft));

    const { result } = renderHook(() => useProfileEditDraft('patient-1'));

    // Wait a tick for effects to settle
    await act(() => Promise.resolve());

    expect(result.current.isDraftLoaded).toBe(true);
    expect(result.current.initialDraft).toEqual(draft);
  });

  it('reloads draft when fhirId changes to a different value', async () => {
    // Pre-populate drafts for two different fhirIds
    const draftA = { name: 'Alice', email: 'alice@test.com' };
    const draftB = { name: 'Bob', email: 'bob@test.com' };
    localStorage.setItem(`${STORAGE_PREFIX}patient-a`, JSON.stringify(draftA));
    localStorage.setItem(`${STORAGE_PREFIX}patient-b`, JSON.stringify(draftB));

    const { result, rerender } = renderHook(
      ({ fhirId }) => useProfileEditDraft(fhirId),
      { initialProps: { fhirId: 'patient-a' } }
    );

    await act(() => Promise.resolve());

    expect(result.current.isDraftLoaded).toBe(true);
    expect(result.current.initialDraft).toEqual(draftA);

    // Switch to patient-b — should reload the new draft
    rerender({ fhirId: 'patient-b' });

    await act(() => Promise.resolve());

    expect(result.current.isDraftLoaded).toBe(true);
    expect(result.current.initialDraft).toEqual(draftB);
  });

  it('resets initialDraft to null when fhirId changes and no draft exists', async () => {
    const draftA = { name: 'Alice' };
    localStorage.setItem(`${STORAGE_PREFIX}patient-a`, JSON.stringify(draftA));

    const { result, rerender } = renderHook(
      ({ fhirId }) => useProfileEditDraft(fhirId),
      { initialProps: { fhirId: 'patient-a' } }
    );

    await act(() => Promise.resolve());
    expect(result.current.initialDraft).toEqual(draftA);

    // Switch to patient-c which has no draft
    rerender({ fhirId: 'patient-c' });

    await act(() => Promise.resolve());

    expect(result.current.initialDraft).toBeNull();
    expect(result.current.isDraftLoaded).toBe(true);
  });

  it('returns null initialDraft when no draft exists for fhirId', async () => {
    const { result } = renderHook(() => useProfileEditDraft('no-draft-id'));

    await act(() => Promise.resolve());

    expect(result.current.isDraftLoaded).toBe(true);
    expect(result.current.initialDraft).toBeNull();
  });

  it('removes corrupt draft entry and warns', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    localStorage.setItem(`${STORAGE_PREFIX}corrupt`, 'not-valid-json{{{');

    const { result } = renderHook(() => useProfileEditDraft('corrupt'));

    await act(() => Promise.resolve());

    // Corrupt entry should be removed
    expect(localStorage.getItem(`${STORAGE_PREFIX}corrupt`)).toBeNull();
    expect(result.current.initialDraft).toBeNull();
    expect(result.current.isDraftLoaded).toBe(true);
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('[profile-draft] corrupt entry'),
      'corrupt'
    );

    consoleWarn.mockRestore();
  });

  it('saveDraft persists data to localStorage', async () => {
    const { result } = renderHook(() => useProfileEditDraft('save-test'));

    await act(() => Promise.resolve());

    act(() => {
      result.current.saveDraft({ name: 'Jane', age: 30 });
    });

    const stored = localStorage.getItem(`${STORAGE_PREFIX}save-test`);
    assertDefined(stored);
    expect(JSON.parse(stored)).toEqual({ name: 'Jane', age: 30 });
  });

  it('clearDraft removes draft from localStorage', async () => {
    localStorage.setItem(
      `${STORAGE_PREFIX}clear-test`,
      JSON.stringify({ x: 1 })
    );

    const { result } = renderHook(() => useProfileEditDraft('clear-test'));

    await act(() => Promise.resolve());

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(`${STORAGE_PREFIX}clear-test`)).toBeNull();
  });
});
