'use client';

import type { StudyProgress } from '@/utils/fhir/research';
import { useEffect, useRef } from 'react';
import {
  resolveDeepLinks,
  resolveFocusTarget,
  updateResearchUrl
} from './research-url';

interface UseUrlSyncParams {
  searchParams: { get: (key: string) => string | null };
  studies: StudyProgress[];
  activeStudyId: string | null;
  setActiveStudyId: (id: string | null) => void;
  setDetailStudyId: (id: string | null) => void;
  router: { replace: (url: string) => void };
}

/**
 * Synchronizes the active study and detail drawer from URL params.
 * Runs only when the URL or the studies change.
 */
export function useUrlSync({
  searchParams,
  studies,
  activeStudyId,
  setActiveStudyId,
  setDetailStudyId,
  router
}: UseUrlSyncParams) {
  const activeStudyIdRef = useRef(activeStudyId);
  useEffect(() => {
    activeStudyIdRef.current = activeStudyId;
  }, [activeStudyId]);

  useEffect(() => {
    const { knownId, knownView } = resolveDeepLinks(searchParams, studies);
    const requestedId = searchParams.get('id');
    const requestedView = searchParams.get('view');

    const needsRewrite =
      Boolean(requestedId && requestedView) ||
      (Boolean(requestedId) && !knownId) ||
      (Boolean(requestedView) && !knownView);
    if (needsRewrite) {
      router.replace(
        updateResearchUrl(searchParams, {
          id: knownView ? null : (knownId?.study.id ?? null),
          view: knownView?.study.id ?? null
        })
      );
    }

    const targetId = resolveFocusTarget(
      knownId,
      knownView,
      activeStudyIdRef.current,
      studies
    );
    setActiveStudyId(targetId);
    setDetailStudyId(knownView?.study.id ?? null);
  }, [searchParams, studies, router, setActiveStudyId, setDetailStudyId]);
}
