import type { StudyProgress } from '@/utils/fhir/research';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useParticipate } from '../use-participate';

const study = {
  study: { id: 's1' },
  firstUncompletedQuestionnaireId: 'q1'
} as unknown as StudyProgress;

describe('useParticipate', () => {
  it('navigates when consented using first uncompleted questionnaire', () => {
    const push = vi.fn();
    const { result } = renderHook(() =>
      useParticipate({
        isConsented: () => true,
        setPendingConsent: vi.fn(),
        router: { push }
      })
    );
    result.current(study);
    expect(push).toHaveBeenCalledWith('/assessments?id=q1&study=s1');
  });

  it('opens pending consent when not consented', () => {
    const setPendingConsent = vi.fn();
    const { result } = renderHook(() =>
      useParticipate({
        isConsented: () => false,
        setPendingConsent,
        router: { push: vi.fn() }
      })
    );
    result.current(study, 'q2');
    expect(setPendingConsent).toHaveBeenCalledWith({
      studyId: 's1',
      questionnaireId: 'q2'
    });
  });
});
