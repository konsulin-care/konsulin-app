import type { QuestionnaireInfo } from '@/services/api/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContributionDashboard from '../contribution-dashboard';
import { makeProgress, makeStudyProgress } from './research-fixtures';

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

const INFO_MAP: Record<string, QuestionnaireInfo> = {
  phq2: { title: 'PHQ-2', durationMinutes: 8 },
  'big-five-inventory': { title: 'Big Five Inventory', durationMinutes: 15 }
};

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });
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
          phq2: { title: 'PHQ-2', durationMinutes: 10 }
        }}
      />
    );

    // 10-minute questionnaire → 50 XP → 50% of the first level.
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
          phq2: { title: 'PHQ-2', durationMinutes: 30 }
        }}
      />
    );

    // 30-minute questionnaire → 150 XP → level 2 with 50 XP into it.
    expect(screen.getByTestId('dashboard-halo-ring')).toHaveAttribute(
      'data-fraction',
      '0.5'
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
      '3 joined via your link'
    );
  });

  it('omits the section heading to keep the dashboard compact', () => {
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

    expect(screen.queryByText('Your contribution')).toBeNull();
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

  it('names the single remaining questionnaire and never suggests completed ones', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({ data: { converted: 92, joined: 92 } });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={makeStudyProgress()}
        questionnaireInfo={INFO_MAP}
      />
    );

    // phq2 is already completed in the fixture, so the mission must point at
    // the remaining Big Five Inventory instead of suggesting phq2 again.
    const mission = screen.getByTestId('dashboard-mission').textContent ?? '';
    expect(mission).toBe(
      'Complete Big Five Inventory (+75 XP) or 8 referrals to reach Pathfinder'
    );
    expect(mission).toContain('Big Five Inventory');
    expect(mission).not.toContain('PHQ-2');
  });

  it('tells guests to wait for the next batch without an active batch', () => {
    mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={INFO_MAP}
      />
    );

    expect(screen.getByTestId('dashboard-mission').textContent).toBe(
      'Check back for the next batch to level up'
    );
  });

  it('names the batch XP and referral shortfall when the batch is not enough', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({ data: { converted: 70, joined: 70 } });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={makeStudyProgress({
          currentBatch: {
            id: 'batch-1',
            start: '2026-08-01',
            end: '2026-08-31',
            questionnaireIds: ['gad7']
          },
          completedQuestionnaireIds: []
        })}
        questionnaireInfo={{
          gad7: { title: 'GAD-7', durationMinutes: 3 }
        }}
      />
    );

    // 3 minutes → 15 XP from the batch; 30 XP needed → 15 referral shortfall.
    expect(screen.getByTestId('dashboard-mission').textContent).toBe(
      'Complete this batch (+15 XP) and 15 referrals to reach Pathfinder'
    );
  });

  it('counts the questionnaire subset that closes the gap', () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({ data: { converted: 17, joined: 17 } });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={makeStudyProgress({
          currentBatch: {
            id: 'batch-1',
            start: '2026-08-01',
            end: '2026-08-31',
            questionnaireIds: ['phq2', 'gad7']
          },
          completedQuestionnaireIds: []
        })}
        questionnaireInfo={{
          phq2: { title: 'PHQ-2', durationMinutes: 8 },
          gad7: { title: 'GAD-7', durationMinutes: 12 }
        }}
      />
    );

    // 83 XP needed; 40 + 60 XP available → both questionnaires together close
    // the gap, but neither does alone.
    expect(screen.getByTestId('dashboard-mission').textContent).toBe(
      'Complete 2 questionnaires or 83 referrals to reach Pathfinder'
    );
  });

  it('opens the rewards popover listing every reached level when the title is clicked', async () => {
    mockUseAuth.mockReturnValue({
      state: { userInfo: { fhirId: 'PAT-1' } },
      isLoading: false
    });
    mockUseCircleStats.mockReturnValue({
      data: { converted: 150, joined: 150 }
    });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    // 150 XP → Pathfinder title; rewards of Trailblazer and Pathfinder both
    // accumulate, oldest first.
    expect(screen.getByRole('button', { name: 'Pathfinder' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('dashboard-title'));

    expect(
      await screen.findByText(/As a Pathfinder, you will receive:/)
    ).toBeTruthy();
    const items = screen.getAllByTestId('dashboard-reward-item');
    expect(items.map(item => item.textContent)).toEqual([
      'Personal result brief for every questionnaire',
      'Personalized summary report + in-app title badge'
    ]);
  });

  it('keeps the guest title non-interactive without a rewards popover', () => {
    mockUseAuth.mockReturnValue({ state: { userInfo: {} }, isLoading: false });

    render(
      <ContributionDashboard
        progress={makeProgress({ questionnaireResponses: [] })}
        activeStudy={null}
        questionnaireInfo={{}}
      />
    );

    expect(screen.getByTestId('dashboard-title').textContent).toBe(
      'Participant'
    );
    fireEvent.click(screen.getByTestId('dashboard-title'));
    expect(screen.queryByText(/you will receive:/)).toBeNull();
  });
});
