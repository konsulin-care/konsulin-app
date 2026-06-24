'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

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
  const lastFhirIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fhirId) return;

    // Skip if already loaded for this fhirId
    if (lastFhirIdRef.current === fhirId) return;
    lastFhirIdRef.current = fhirId;

    // Reset state before loading draft for new fhirId
    setInitialDraft(null);
    setIsDraftLoaded(false);

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + fhirId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setInitialDraft(parsed);
        }
      }
    } catch {
      // Remove corrupt entry so it doesn't block future loads
      localStorage.removeItem(STORAGE_PREFIX + fhirId);
      console.warn('[profile-draft] corrupt entry removed for', fhirId);
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
