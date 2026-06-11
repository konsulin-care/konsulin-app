'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'profile-edit-draft-';

/**
 * Persists profile edit form state to localStorage so browser back/forward
 * restores unsaved edits. Keyed by fhirId.
 *
 * - `initialDraft`: loaded draft data (null if none), ready after mount
 * - `saveDraft(data)`: writes draft to localStorage (call from debounced onChange)
 * - `clearDraft()`: removes draft after successful submit
 */
export function useProfileEditDraft(fhirId: string) {
  const [initialDraft, setInitialDraft] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!fhirId || loadedRef.current) return;
    loadedRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + fhirId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setInitialDraft(parsed);
        }
      }
    } catch {
      // corrupt entry — ignore
    }
    setIsDraftLoaded(true);
  }, [fhirId]);

  const saveDraft = useCallback(
    (data: Record<string, unknown>) => {
      if (!fhirId) return;
      try {
        localStorage.setItem(STORAGE_PREFIX + fhirId, JSON.stringify(data));
      } catch (err) {
        console.warn('[profile-draft] save error', err);
      }
    },
    [fhirId]
  );

  const clearDraft = useCallback(() => {
    if (!fhirId) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + fhirId);
    } catch (err) {
      console.warn('[profile-draft] clear error', err);
    }
  }, [fhirId]);

  return { initialDraft, isDraftLoaded, saveDraft, clearDraft };
}
