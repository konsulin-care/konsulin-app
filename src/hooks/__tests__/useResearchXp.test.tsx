import { GUEST_TITLE, getResearchLevel } from '@/constants/research';
import type { QuestionnaireInfo } from '@/services/api/research';
import {
  computeQuestionnaireXp,
  type ResearchProgress
} from '@/utils/fhir/research';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResearchXp } from '../useResearchXp';

const { mockUseAuth, mockUseCircleStats } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<
    () => {
      state: { userInfo: { fhirId?: string; fullname?: string } };
      isLoading: boolean;
    }
  >(),
  mockUseCircleStats:
    vi.fn<() => { data?: { converted: number; joined: number } }>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
}));

const INFO_MAP: ReadonlyMap<string, QuestionnaireInfo> = new Map([
  ['phq2', { title: 'PHQ-2', durationMinutes: 8 }],
  ['big-five-inventory', { title: 'Big Five', durationMinutes: 15 }]
]);

/** Minimal ResearchProgress with empty study data by default. */
function makeProgress(
  overrides: Partial<ResearchProgress> = {}
): ResearchProgress {
  return {
    studies: [],
    cumulativeResponses: 0,
    questionnaireResponses: [],
    questionnaireXp: 0,
    completedQuestionnaireIds: [],
    consentedStudyIds: [],
    ...overrides
  };
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseCircleStats.mockReset();
  mockUseCircleStats.mockReturnValue({ data: { converted: 0, joined: 0 } });
});

describe('useResearchXp', () => {
  it('computes questionnaireXp via computeQuestionnaireXp over responses and durations', () => {
    const progress = makeProgress({
      questionnaireResponses: ['phq2', 'big-five-inventory']
    });

    const { result } = renderHook(() => useResearchXp(progress, INFO_MAP));

    const durationMap = new Map(
      [...INFO_MAP].map(([id, info]) => [id, info.durationMinutes])
    );
    expect(result.current.questionnaireXp).toBe(
      computeQuestionnaireXp(progress.questionnaireResponses, durationMap)
    );
    // 8 min -> 40 XP, 15 min -> 75 XP.
    expect(result.current.questionnaireXp).toBe(115);
    expect(result.current.totalXp).toBe(115);
  });

  it('adds circle converted referrals to totalXp for a patient', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({
      data: { converted: 450, joined: 450 }
    });

    const progress = makeProgress({ questionnaireResponses: ['phq2'] });
    const { result } = renderHook(() => useResearchXp(progress, INFO_MAP));

    expect(result.current.isPatient).toBe(true);
    expect(mockUseCircleStats).toHaveBeenCalledWith('PAT-1');
    expect(result.current.questionnaireXp).toBe(40);
    expect(result.current.converted).toBe(450);
    expect(result.current.totalXp).toBe(490);
  });

  it('returns converted 0 and GUEST_TITLE for a guest', () => {
    const progress = makeProgress({ questionnaireResponses: ['phq2'] });
    const { result } = renderHook(() => useResearchXp(progress, INFO_MAP));

    expect(result.current.isPatient).toBe(false);
    expect(mockUseCircleStats).toHaveBeenCalledWith(undefined);
    expect(result.current.converted).toBe(0);
    expect(result.current.title).toBe(GUEST_TITLE);
    // Guest totalXp still carries questionnaire XP but no referral XP.
    expect(result.current.totalXp).toBe(40);
  });

  it('returns getResearchLevel(totalXp) as the title for a patient', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({
      data: { converted: 150, joined: 150 }
    });

    const progress = makeProgress({ questionnaireResponses: ['phq2'] });
    const { result } = renderHook(() => useResearchXp(progress, INFO_MAP));

    // 40 questionnaire XP + 150 converted = 190 -> Pathfinder (100+).
    expect(result.current.totalXp).toBe(190);
    expect(result.current.title).toBe(getResearchLevel(190));
    expect(result.current.title.label).toBe('Pathfinder');
  });
});
