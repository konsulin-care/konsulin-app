import type { StudyProgress } from '@/utils/fhir/research';
import { useCallback } from 'react';

interface ParticipateInput {
  isConsented: (studyId: string) => boolean;
  setPendingConsent: (consent: {
    studyId: string;
    questionnaireId?: string;
  }) => void;
  router: { push: (href: string) => void };
}

/**
 * Builds the participate action: navigates to the assessment when consented,
 * otherwise opens the pending consent.
 *
 * @param input Consent predicate, pending-consent setter and router.
 * @returns participate(study, questionnaireId?) callback.
 */
export function useParticipate({
  isConsented,
  setPendingConsent,
  router
}: ParticipateInput) {
  return useCallback(
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
}
