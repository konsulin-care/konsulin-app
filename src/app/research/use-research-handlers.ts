'use client';

import type { StudyProgress } from '@/utils/fhir/research';
import { useSearchParams } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { updateResearchUrl } from './research-url';

interface UseResearchHandlersParams {
  studies: StudyProgress[];
  detailStudyId: string | null;
  isConsented: (studyId: string) => boolean;
  setActiveStudyId: (id: string | null) => void;
  setDetailStudyId: (id: string | null) => void;
  setPendingConsent: (
    consent: { studyId: string; questionnaireId?: string } | null
  ) => void;
  router: { push: (url: string) => void; replace: (url: string) => void };
}

/** Returns handler functions for research page interactions. */
export function useResearchHandlers({
  studies,
  detailStudyId,
  isConsented,
  setActiveStudyId,
  setDetailStudyId,
  setPendingConsent,
  router
}: UseResearchHandlersParams) {
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const handleSlideChange = useCallback(
    (studyId: string) => {
      setActiveStudyId(studyId);
      if (detailStudyId === studyId) return;
      const sp = searchParamsRef.current;
      if (sp.get('id') === studyId || sp.get('view') === studyId) {
        return;
      }
      if (sp.get('view')) {
        setDetailStudyId(null);
        router.replace(updateResearchUrl(sp, { id: studyId, view: null }));
      } else {
        router.replace(updateResearchUrl(sp, { id: studyId }));
      }
    },
    [router, setActiveStudyId, setDetailStudyId, detailStudyId]
  );

  const handleResearcherStudyClick = useCallback(
    (studyId: string) => {
      setDetailStudyId(studyId);
      router.replace(
        updateResearchUrl(searchParamsRef.current, { view: studyId })
      );
    },
    [router, setDetailStudyId]
  );

  const handleStudyClick = useCallback(
    (studyId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      if (study?.isComplete) {
        router.push(`/report?id=${studyId}`);
        return;
      }
      setDetailStudyId(studyId);
      const sp = searchParamsRef.current;
      if (sp.get('view') === studyId) return;
      router.replace(updateResearchUrl(sp, { view: studyId }));
    },
    [router, setDetailStudyId, studies]
  );

  const handleSeeReport = useCallback(
    (studyId: string) => {
      router.push(`/report?id=${studyId}`);
    },
    [router]
  );

  const handleDrawerClose = useCallback(() => {
    setDetailStudyId(null);
    router.replace(
      updateResearchUrl(searchParamsRef.current, {
        id: detailStudyId,
        view: null
      })
    );
  }, [detailStudyId, router, setDetailStudyId]);

  const participate = useCallback(
    (study: StudyProgress | null, questionnaireId?: string) => {
      if (!study) return;
      const target = questionnaireId ?? study.firstUncompletedQuestionnaireId;
      if (isConsented(study.study.id)) {
        if (target) {
          router.push(`/assessments?id=${target}&study=${study.study.id}`);
        }
        return;
      }
      setPendingConsent({ studyId: study.study.id, questionnaireId });
    },
    [isConsented, router, setPendingConsent]
  );

  const handleQuestionnaireClick = useCallback(
    (studyId: string, questionnaireId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      participate(study ?? null, questionnaireId);
    },
    [participate, studies]
  );

  return {
    handleSlideChange,
    handleResearcherStudyClick,
    handleStudyClick,
    handleSeeReport,
    handleDrawerClose,
    participate,
    handleQuestionnaireClick
  };
}
