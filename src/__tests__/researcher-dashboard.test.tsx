import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherDashboard from '../app/researcher-dashboard';

const mockDashboardData = {
  studies: [
    {
      study: {
        id: 'study-1',
        title: 'Mental Health Survey',
        status: 'active',
        description: 'A study about mental health'
      },
      batches: [
        {
          id: 'batch-1',
          start: '2026-01-01',
          end: '2026-12-31',
          questionnaireIds: ['phq2']
        }
      ],
      currentBatch: {
        id: 'batch-1',
        start: '2026-01-01',
        end: '2026-12-31',
        questionnaireIds: ['phq2']
      },
      daysRemaining: 100
    }
  ],
  totalParticipants: 42
};

let mockReturnValue = {
  data: mockDashboardData,
  isLoading: false,
  isError: false
};

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => mockReturnValue
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('ResearcherDashboard', () => {
  it('renders stat cards with correct counts', () => {
    mockReturnValue = {
      data: mockDashboardData,
      isLoading: false,
      isError: false
    };
    renderWithQuery(<ResearcherDashboard />);

    expect(screen.getByText('Ongoing Studies')).toBeInTheDocument();
    expect(screen.getByText('Total Participants')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active Batches')).toBeInTheDocument();
    // Verify stat card has value 1 (studies count)
    const statCards = screen.getAllByText(/^\d+$/);
    expect(statCards.some(el => el.textContent === '1')).toBe(true);
  });

  it('renders study list with study title', () => {
    mockReturnValue = {
      data: mockDashboardData,
      isLoading: false,
      isError: false
    };
    renderWithQuery(<ResearcherDashboard />);

    expect(screen.getByText('My Research')).toBeInTheDocument();
    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
  });

  it('renders empty state when no studies', () => {
    mockReturnValue = {
      data: { studies: [], totalParticipants: 0 },
      isLoading: false,
      isError: false
    };
    renderWithQuery(<ResearcherDashboard />);

    expect(screen.getByText('No research studies yet')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    mockReturnValue = {
      data: undefined,
      isLoading: true,
      isError: false
    };
    const { container } = renderWithQuery(<ResearcherDashboard />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
