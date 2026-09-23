import { wrapper } from '@/app/research/__tests__/research-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherImpactDashboard from '../researcher-impact-dashboard';
import { makeStudyWithBatches } from './research-fixtures';

// Mock useAuth
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fullname: 'Dr. Smith',
        email: 'smith@example.com',
        userId: 'user-1',
        fhirId: 'practitioner-1',
        profile_picture: undefined
      }
    }
  })
}));

// Mock useResearcherImpact
vi.mock('@/hooks/useResearcherImpact', () => ({
  useResearcherImpact: () => ({
    totalImpact: 150,
    level: { label: 'Torchbearer', icon: vi.fn(), reward: 'Early access' },
    levelNumber: 2,
    impactInLevel: 50,
    perStudy: [
      {
        studyId: 'study-1',
        participantCount: 25,
        impactPoints: 275,
        milestonesHit: 1
      }
    ],
    mission: 'Enroll 6 participants to hit the next milestone.',
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
    backgroundColor: '#13c2c2',
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

  it('renders the level halo', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudyWithBatches('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper }
    );
    expect(screen.getByTestId('researcher-halo-ring')).toBeInTheDocument();
    expect(screen.getByTestId('researcher-level')).toHaveTextContent('Lv 2');
  });

  it('renders the level title', () => {
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

  it('renders total participants stat', () => {
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

  it('renders total impact points stat', () => {
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
      'Enroll 6 participants to hit the next milestone.'
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

  it('renders milestones with Next Milestones heading', () => {
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
    expect(shareButton).toHaveClass('border-t', 'border-gray-100', 'pt-2');
    expect(shareButton).toHaveClass('text-[10px]');
    expect(shareButton).toHaveClass('mt-auto');
  });
});
