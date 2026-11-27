import type { StudyProgress } from '@/utils/fhir/research';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutate = vi.fn();
const useConsentToStudy = vi.fn();

vi.mock('@/services/api/research', () => ({
  useConsentToStudy: (studyId: string) => useConsentToStudy(studyId)
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { useConsent } from '../use-consent';

const STUDIES = [
  {
    study: { id: 's1' },
    batches: [],
    currentBatch: null,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'q1',
    completedQuestionnaireIds: [],
    history: []
  } as unknown as StudyProgress
];

/**
 * Renders useConsent as a signed-in patient with the given consented ids.
 *
 * @param consentedStudyIds - Study ids the patient is already consented to.
 * @param setPendingConsent - Spy receiving the pending-consent reset.
 * @param push - Router push spy.
 * @returns The renderHook result.
 */
function renderPatientConsent(
  consentedStudyIds: string[],
  setPendingConsent: (value: null) => void,
  push: (url: string) => void
) {
  return renderHook(() =>
    useConsent({
      isPatient: true,
      studies: STUDIES,
      consentedStudyIds,
      pendingConsent: { studyId: 's1' },
      setPendingConsent,
      router: { push }
    })
  );
}

beforeEach(() => {
  mutate.mockReset();
  useConsentToStudy.mockReset();
  useConsentToStudy.mockReturnValue({ mutate, isPending: false });
});

describe('useConsent handleAgree', () => {
  it('skips the consent bundle for an already consented study and goes to the questionnaire', () => {
    const setPendingConsent = vi.fn();
    const push = vi.fn();
    const { result } = renderPatientConsent(['s1'], setPendingConsent, push);

    result.current.handleAgree();

    expect(mutate).not.toHaveBeenCalled();
    expect(setPendingConsent).toHaveBeenCalledWith(null);
    expect(push).toHaveBeenCalledWith('/assessments?id=q1&study=s1');
  });

  it('does not post again while a consent mutation is in flight', () => {
    useConsentToStudy.mockReturnValue({ mutate, isPending: true });
    const setPendingConsent = vi.fn();
    const push = vi.fn();
    const { result } = renderPatientConsent([], setPendingConsent, push);

    result.current.handleAgree();

    expect(mutate).not.toHaveBeenCalled();
    expect(setPendingConsent).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('posts the consent bundle once for an unconsented study', () => {
    const setPendingConsent = vi.fn();
    const push = vi.fn();
    const { result } = renderPatientConsent([], setPendingConsent, push);

    result.current.handleAgree();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(useConsentToStudy).toHaveBeenCalledWith('s1');
  });
});
