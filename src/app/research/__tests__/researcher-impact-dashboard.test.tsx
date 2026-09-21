import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherImpactDashboard from '../researcher-impact-dashboard';

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
    mission: 'Earn 150 more impact points to reach Vanguard',
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

function makeStudy(id: string): ResearchStudyWithBatches {
  return {
    study: {
      resourceType: 'ResearchStudy' as const,
      id,
      title: `Study ${id}`,
      status: 'active' as const
    },
    batches: [
      {
        id: `${id}-batch-0`,
        start: '2026-01-01',
        end: '2026-12-31',
        questionnaireIds: ['q-1']
      }
    ],
    currentBatch: {
      id: `${id}-batch-0`,
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['q-1']
    },
    daysRemaining: 30
  };
}

describe('ResearcherImpactDashboard', () => {
  it('renders the dashboard section', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(
      screen.getByTestId('researcher-impact-dashboard')
    ).toBeInTheDocument();
  });

  it('renders the level halo', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('researcher-halo-ring')).toBeInTheDocument();
    expect(screen.getByTestId('researcher-level')).toHaveTextContent('Lv 2');
  });

  it('renders the level title', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent(
      'Torchbearer'
    );
  });

  it('renders total participants stat', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('dashboard-participants')).toHaveTextContent(
      '25 total participants'
    );
  });

  it('renders total impact points stat', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('dashboard-impact')).toHaveTextContent(
      '150 impact points'
    );
  });

  it('renders the mission line', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('dashboard-mission')).toHaveTextContent(
      'Earn 150 more impact points to reach Vanguard'
    );
  });

  it('renders the share button', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('share-research-footer')).toBeInTheDocument();
  });

  it('renders milestones for the active study', () => {
    render(
      <ResearcherImpactDashboard
        studies={[makeStudy('study-1')]}
        activeStudyId='study-1'
        practitionerId='practitioner-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Milestones — Study study-1')).toBeInTheDocument();
    expect(screen.getByText('10 participants')).toBeInTheDocument();
    expect(screen.getByText('50 participants')).toBeInTheDocument();
    expect(screen.getByText('100 participants')).toBeInTheDocument();
  });
});
