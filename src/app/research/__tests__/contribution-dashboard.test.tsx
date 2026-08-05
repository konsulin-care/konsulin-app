import type { QuestionnaireInfo } from '@/services/api/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContributionDashboard from '../contribution-dashboard';
import { makeProgress, makeStudyProgress } from './research-fixtures';

const { mockUseAuth, mockUseShareBooster, mockUseCircleStats } = vi.hoisted(
  () => ({
    mockUseAuth: vi.fn<
      () => {
        state: { userInfo: { fhirId?: string; fullname?: string } };
        isLoading: boolean;
      }
    >(),
    mockUseShareBooster:
      vi.fn<() => { count: number; increment: () => void }>(),
    mockUseCircleStats:
      vi.fn<() => { data?: { converted: number; joined: number } }>()
  })
);

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/hooks/useShareBooster', () => ({
  useShareBooster: mockUseShareBooster
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
}));

const INFO_MAP: Record<string, QuestionnaireInfo> = {
  phq2: { title: 'PHQ-2', durationMinutes: 8 },
  'big-five-inventory': { title: 'Big Five Inventory', durationMinutes: 15 }
};

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
  mockUseShareBooster.mockReset();
  mockUseShareBooster.mockReturnValue({ count: 0, increment: vi.fn() });
  mockUseCircleStats.mockReset();
  mockUseCircleStats.mockReturnValue({ data: { converted: 0, joined: 0 } });
});

describe('ContributionDashboard', () => {
  it('renders the halo ring at the XP fraction within the current level', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1', fullname: 'Ada Lovelace' } },
      isLoading: false
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: ['phq2'] })}
        activeStudy={null}
        questionnaireInfo={{
          phq2: { title: 'PHQ-2', durationMinutes: 50 }
        }}
      />
    );

    // 50 XP questionnaire + 0 shares + 0 converted → 50% of the first level.
    expect(screen.getByTestId('dashboard-halo-ring')).toHaveAttribute(
      'data-fraction',
      '0.5'
    );
    expect(screen.getByTestId('dashboard-level').textContent).toContain('Lv 1');
  });

  it('ticks the level number when XP crosses a level boundary', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1', fullname: 'Ada Lovelace' } },
      isLoading: false
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: ['phq2'] })}
        activeStudy={null}
        questionnaireInfo={{
          phq2: { title: 'PHQ-2', durationMinutes: 150 }
        }}
      />
    );

    expect(screen.getByTestId('dashboard-level').textContent).toContain('Lv 2');
  });

  it('shows the patient title from total XP and the converted count', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1', fullname: 'Ada Lovelace' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({
      data: { converted: 3, joined: 3 }
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-title').textContent).toBe(
      'Trailblazer'
    );
    expect(screen.getByTestId('dashboard-converted').textContent).toContain(
      '3 people'
    );
  });

  it('keeps the guest title fixed to Participant regardless of XP', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: {} },
      isLoading: false
    });

    render(
      <ContributionDashboard
        progress={makeProgress({
          questionnaireResponses: ['phq2', 'phq2'],
          questionnaireXp: 160
        })}
        activeStudy={null}
        questionnaireInfo={{
          phq2: { title: 'PHQ-2', durationMinutes: 80 }
        }}
      />
    );

    expect(screen.getByTestId('dashboard-title').textContent).toBe(
      'Participant'
    );
  });

  it('shows an invite nudge instead of a converted count for guests', () => {
    mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-converted').textContent).toContain(
      'Invite friends to start'
    );
  });

  it('shows the current batch completion rate from the active study', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={makeStudyProgress()}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-batch-count').textContent).toBe(
      '1/2 questionnaires'
    );
  });

  it('names the questionnaire that closes the XP gap in the mission', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseShareBooster.mockReturnValue({ count: 92, increment: vi.fn() });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={makeStudyProgress()}
        questionnaireInfo={INFO_MAP}
      />
    );

    expect(screen.getByTestId('dashboard-mission').textContent).toBe(
      'Complete PHQ-2 (+8 XP) to reach Pathfinder'
    );
  });

  it('falls back to a share mission for guests without an active batch', () => {
    mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
    mockUseShareBooster.mockReturnValue({ count: 88, increment: vi.fn() });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-mission').textContent).toBe(
      '12 shares to level up'
    );
  });

  it('collapses the vault to the current reward and expands to next + ladder', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-vault-current').textContent).toContain(
      'Personal result brief for every questionnaire'
    );
    expect(
      screen.queryByTestId('dashboard-vault-next')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dashboard-vault-toggle'));

    expect(screen.getByTestId('dashboard-vault-next').textContent).toContain(
      'Personalized summary report + in-app title badge'
    );
    // Full ladder: every title is listed with its XP threshold (the current
    // title also appears in the badge above, so match all occurrences).
    for (const label of [
      'Trailblazer',
      'Pathfinder',
      'Torchbearer',
      'Vanguard',
      'Pioneer'
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});
