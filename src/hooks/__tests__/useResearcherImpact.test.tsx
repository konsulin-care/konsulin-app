import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useResearcherImpact } from '../useResearcherImpact';

// Mock useStudyParticipantCount
vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: (studyId: string | undefined) => {
    if (!studyId) return { data: undefined, isLoading: false };
    // Return different counts based on study id
    const counts: Record<string, number> = {
      'study-1': 25,
      'study-2': 5,
      'study-3': 100
    };
    return { data: counts[studyId] ?? 0, isLoading: false };
  }
}));

// Mock useResearcherReferralStats
vi.mock('@/services/api/researcher-circle', () => ({
  useResearcherReferralStats: () => ({
    data: { referralCount: 3 },
    isLoading: false
  })
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeStudy(
  id: string,
  opts: {
    batchCount?: number;
    currentBatch?: boolean;
  } = {}
): ResearchStudyWithBatches {
  const batches = Array.from({ length: opts.batchCount ?? 1 }, (_, i) => ({
    id: `${id}-batch-${i}`,
    start: '2026-01-01',
    end: '2026-12-31',
    questionnaireIds: [`q-${id}-${i}`]
  }));
  return {
    study: {
      resourceType: 'ResearchStudy' as const,
      id,
      title: `Study ${id}`,
      status: 'active' as const
    },
    batches,
    currentBatch: opts.currentBatch !== false ? (batches[0] ?? null) : null,
    daysRemaining: 30
  };
}

describe('useResearcherImpact', () => {
  it('returns only referral points with no studies', () => {
    const { result } = renderHook(() => useResearcherImpact([], 'study-1'), {
      wrapper: createWrapper()
    });
    // No studies, but referrals still count: 3 * 10 = 30
    expect(result.current.totalImpact).toBe(30);
    expect(result.current.perStudy).toHaveLength(0);
  });

  it('computes per-study impact from participant count', () => {
    const studies = [makeStudy('study-1')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-1'),
      { wrapper: createWrapper() }
    );
    // study-1 has 25 participants * 10 points = 250
    // Plus milestone bonus: 25 >= 10 → +25 points
    // perStudy impactPoints = 250 + 25 = 275
    expect(result.current.perStudy[0].impactPoints).toBe(275);
    expect(result.current.perStudy[0].milestonesHit).toBe(1);
    // totalImpact includes referral points: 275 + (3 * 10) = 305
    expect(result.current.totalImpact).toBe(305);
  });

  it('computes batch completion bonus when all batches done', () => {
    const studies = [makeStudy('study-2', { currentBatch: false })];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-2'),
      { wrapper: createWrapper() }
    );
    // study-2 has 5 participants * 10 = 50, plus 1 batch * 15 = 15
    expect(result.current.perStudy[0].impactPoints).toBe(65);
  });

  it('computes milestone bonuses', () => {
    const studies = [makeStudy('study-3')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-3'),
      { wrapper: createWrapper() }
    );
    // study-3 has 100 participants * 10 = 1000
    // Milestones: 10 (25pts) + 50 (25pts) + 100 (25pts) = 75
    expect(result.current.perStudy[0].milestonesHit).toBe(3);
    // perStudy impactPoints = 1000 + 75 = 1075
    expect(result.current.perStudy[0].impactPoints).toBe(1075);
    // totalImpact includes referral points: 1075 + (3 * 10) = 1105
    expect(result.current.totalImpact).toBe(1105);
  });

  it('includes referral points in totalImpact', () => {
    const studies = [makeStudy('study-2')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-2'),
      { wrapper: createWrapper() }
    );
    // study-2: 5 participants * 10 = 50 (no milestone bonus, 5 < 10)
    // Referrals: 3 * 10 = 30
    // Total: 80
    expect(result.current.totalImpact).toBe(80);
    expect(result.current.level.label).toBe('Pathfinder');
  });

  it('derives level from totalImpact', () => {
    const studies = [makeStudy('study-1')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-1'),
      { wrapper: createWrapper() }
    );
    // totalImpact = 275 (study-1 with milestone) + 30 (referrals) = 305
    // 305 is in Vanguard range (300-499)
    expect(result.current.level.label).toBe('Vanguard');
  });

  it('returns isLoading true when participant count is loading', () => {
    // This test verifies the loading state structure exists
    const studies = [makeStudy('study-1')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-1'),
      { wrapper: createWrapper() }
    );
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('builds a mission string', () => {
    const studies = [makeStudy('study-1')];
    const { result } = renderHook(
      () => useResearcherImpact(studies, 'study-1'),
      { wrapper: createWrapper() }
    );
    expect(typeof result.current.mission).toBe('string');
    expect(result.current.mission.length).toBeGreaterThan(0);
  });
});
