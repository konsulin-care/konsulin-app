import { wrapper } from '@/__tests__/react-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherImpactDashboard from '../researcher-impact-dashboard';
import { makeStudyWithBatches } from './research-fixtures';

// Mock useAuth
vi.mock('@/i18n', async () =>
  (await import('@/__tests__/mocks/i18n-mock')).i18nMockFactory()
);
vi.mock('@/context/auth/authContext', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researcherAuthMock
}));

// Mock useResearcherImpact
vi.mock('@/hooks/useResearcherImpact', () => ({
  useResearcherImpact: () => ({
    totalImpact: 150,
    level: {
      label: 'Torchbearer',
      labelKey: 'level.torchbearer',
      icon: vi.fn(),
      reward: 'Early access to batch results + cohort insights',
      rewardKey: 'researcher_reward.torchbearer'
    },
    levelNumber: 3,
    levelFraction: 0.4,
    impactInLevel: 50,
    perStudy: [
      {
        studyId: 'study-1',
        participantCount: 25,
        impactPoints: 275,
        milestonesHit: 1
      }
    ],
    isLoading: false
  })
}));

// Mock useResearcherDashboard
vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => ({
    data: { totalParticipants: 25 },
    isLoading: false
  })
}));

// Mock useShareStudy
vi.mock('@/hooks/useShareStudy', () => ({
  useShareStudy: () => ({
    shareUrl: 'https://konsulin.care/research?view=study-1',
    copied: false,
    handleShare: vi.fn()
  })
}));

// Mock generateAvatarPlaceholder
vi.mock('@/utils/helper', () => ({
  generateAvatarPlaceholder: () => ({
    initials: 'DS',
    backgroundColor: 'token',
    seed: 'user-1'
  })
}));

describe('ResearcherImpactDashboard', () => {
  it('renders the dashboard section', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(
      screen.getByTestId('researcher-impact-dashboard')
    ).toBeInTheDocument();
  });

  it('renders the level chip and progress bar instead of a halo', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(
      screen.queryByTestId('researcher-halo-ring')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('level-chip')).toHaveTextContent('Lv 3');
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Level progress');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
  });

  it('renders the level title from research messages', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent(
      'Torchbearer'
    );
  });

  it('renders the level reward line translated', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('dashboard-reward')).toHaveTextContent(
      'Early access to batch results + cohort insights'
    );
  });

  it('renders total participants stat from research messages', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('dashboard-participants')).toHaveTextContent(
      '25 total participants'
    );
  });

  it('renders total impact points stat from research messages', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('dashboard-impact')).toHaveTextContent(
      '150 impact points'
    );
  });

  it('renders the mission line with simplified CTA', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('dashboard-mission')).toHaveTextContent(
      'Enroll 25 participants to hit the next milestone.'
    );
  });

  it('renders the share button', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('share-research-footer')).toBeInTheDocument();
  });

  it('renders milestones from research messages', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByText('Next Milestones')).toBeInTheDocument();
    expect(screen.getByText('10 participants')).toBeInTheDocument();
    expect(screen.getByText('50 participants')).toBeInTheDocument();
    expect(screen.getByText('100 participants')).toBeInTheDocument();
  });

  it('share button has patient card footer styling', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    const shareButton = screen.getByTestId('share-research-footer');
    expect(shareButton).toHaveClass('border-t', 'border-border', 'pt-2');
    expect(shareButton).toHaveClass('text-xs');
    expect(shareButton).toHaveClass('mt-auto');
  });
});
