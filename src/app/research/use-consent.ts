'use client';

import { useConsentToStudy } from '@/services/api/research';
import { readConsentFlag, writeConsentFlag } from '@/utils/consent';
import type { StudyProgress } from '@/utils/fhir/research';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

interface UseConsentParams {
  isPatient: boolean;
  studies: StudyProgress[];
  pendingConsent: PendingConsent | null;
  setPendingConsent: (consent: PendingConsent | null) => void;
  router: { push: (url: string) => void };
}

/** Returns consent-related state and handlers. */
export function useConsent({
  isPatient,
  studies,
  pendingConsent,
  setPendingConsent,
  router
}: UseConsentParams) {
  const consentedStudyIds = useMemo(() => {
    if (isPatient) return new Set<string>();
    // For non-patients, read from localStorage
    const ids = new Set<string>();
    for (const study of studies) {
      if (readConsentFlag(window.localStorage, study.study.id)) {
        ids.add(study.study.id);
      }
    }
    return ids;
  }, [isPatient, studies]);

  const isConsented = useCallback(
    (studyId: string) =>
      isPatient
        ? consentedStudyIds.has(studyId)
        : readConsentFlag(window.localStorage, studyId),
    [consentedStudyIds, isPatient]
  );

  const pendingStudyId = pendingConsent?.studyId ?? '';
  const consentMutation = useConsentToStudy(pendingStudyId);

  const handleAgree = useCallback(() => {
    if (!pendingConsent) return;
    const { studyId, questionnaireId } = pendingConsent;
    const study = studies.find(entry => entry.study.id === studyId);
    const target =
      questionnaireId ?? study?.firstUncompletedQuestionnaireId ?? null;
    const finish = () => {
      setPendingConsent(null);
      if (target) router.push(`/assessments?id=${target}&study=${studyId}`);
    };
    if (isPatient) {
      consentMutation.mutate(undefined, {
        onSuccess: finish,
        onError: () => toast.error('Could not record your consent.')
      });
      return;
    }
    writeConsentFlag(window.localStorage, studyId);
    finish();
  }, [
    isPatient,
    pendingConsent,
    router,
    studies,
    consentMutation,
    setPendingConsent
  ]);

  return {
    consentedStudyIds,
    isConsented,
    handleAgree
  };
}
