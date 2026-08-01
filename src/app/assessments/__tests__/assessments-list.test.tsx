import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AssessmentsList from '../assessments-list';

const { mockUseCuratedAssessments, mockUseFeaturedAssessments } = vi.hoisted(
  () => ({
    mockUseCuratedAssessments: vi.fn(),
    mockUseFeaturedAssessments: vi.fn()
  })
);

vi.mock('@/services/api/assessment', () => ({
  useCuratedAssessments: mockUseCuratedAssessments,
  useFeaturedAssessments: mockUseFeaturedAssessments
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn(() => ({
    state: { userInfo: { role_name: 'patient' } },
    isLoading: false
  }))
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/assessments')
}));

vi.mock('@/components/ui/input-with-icon', () => ({
  InputWithIcon: ({
    value,
    onChange,
    placeholder
  }: {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    placeholder: string;
  }) => (
    <input
      data-testid='search-input'
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}));

vi.mock('@/lib/lazy-component', () => ({
  lazyComponent: () => () => <div data-testid='drawer-content' />
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const wrapper = createWrapper();

const MOCK_CURATED = [
  {
    resourceType: 'Questionnaire' as const,
    id: 'phq-9',
    title: 'PHQ-9',
    description: 'Depression screening',
    status: 'active' as const,
    extension: [],
    useContext: [],
    code: []
  },
  {
    resourceType: 'Questionnaire' as const,
    id: 'gad-7',
    title: 'GAD-7',
    description: 'Anxiety screening',
    status: 'active' as const,
    extension: [],
    useContext: [],
    code: []
  }
];

/** Featured item with a distinct ID so it doesn't duplicate grid items. */
const MOCK_FEATURED = [
  {
    resourceType: 'Questionnaire' as const,
    id: 'who-5',
    title: 'WHO-5',
    description: 'Well-being index',
    status: 'active' as const,
    extension: [],
    useContext: [],
    code: []
  }
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('AssessmentsList', () => {
  function renderPage() {
    return render(<AssessmentsList />, { wrapper });
  }

  it('renders the all instruments count', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    expect(screen.getByText('All Instruments (2)')).toBeInTheDocument();
  });

  it('renders search input', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    expect(
      screen.getByPlaceholderText('Search Assessment')
    ).toBeInTheDocument();
  });

  it('renders featured rail with Editor Picks header', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    expect(screen.getByText("Editor's Picks")).toBeInTheDocument();
  });

  it('hides featured rail when no featured items', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: [],
      isLoading: false
    });
    renderPage();
    expect(screen.queryByText("Editor's Picks")).not.toBeInTheDocument();
  });

  it('renders all instruments in a grid', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('filters instruments by search term', async () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'depression' } });

    await waitFor(() => {
      expect(screen.getByText('PHQ-9')).toBeInTheDocument();
      expect(screen.queryByText('GAD-7')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no results match', async () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'zzzznonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No instruments found')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: [],
      isLoading: true
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: [],
      isLoading: true
    });

    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders at least one button (filter trigger)', () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the search badge with secondary colors', async () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'depression' } });

    await waitFor(() => {
      const badge = screen.getByText('Search: depression');
      expect(badge.className).toContain('bg-secondary');
      expect(badge.className).toContain('text-white');
      expect(badge.className).not.toContain('teal');
    });
  });

  it('renders the category badge with secondary colors', async () => {
    mockUseCuratedAssessments.mockReturnValue({
      data: MOCK_CURATED,
      isLoading: false
    });
    mockUseFeaturedAssessments.mockReturnValue({
      data: MOCK_FEATURED,
      isLoading: false
    });
    renderPage();

    // Open the filter drawer and select a category
    fireEvent.click(screen.getAllByRole('button')[0]);
    const checkbox = await screen.findByLabelText('Physical Health');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('Apply'));

    await waitFor(() => {
      const badge = screen.getByText('physical-health');
      expect(badge.className).toContain('bg-secondary');
      expect(badge.className).toContain('text-white');
      expect(badge.className).not.toContain('teal');
    });
  });
});
