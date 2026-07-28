/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ----- global mock factories (hoisted before imports) -----

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  usePopularAssessments: vi.fn(),
  useRegularAssessments: vi.fn(),
  useOngoingResearch: vi.fn(),
  searchQuestionnaires: vi.fn()
}));

vi.mock('@/hooks/useSearchWithFallback', () => ({
  useSearchWithFallback: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn()
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, height, width, className, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      height={height}
      width={width}
      className={className}
      {...props}
    />
  )
}));

vi.mock('react-qr-code', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid='qr-code' {...props} />
}));

vi.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid='markdown'>{children}</div>
}));

vi.mock('lucide-react', () => ({
  AwardIcon: (props: any) => <div data-testid='award-icon' {...props} />,
  BookmarkIcon: (props: any) => <div data-testid='bookmark-icon' {...props} />,
  SearchIcon: (props: any) => <div data-testid='search-icon' {...props} />
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) => (
    <div data-testid='drawer' data-open={open}>
      {children}
    </div>
  ),
  DrawerClose: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  DrawerContent: ({ children, className }: any) => (
    <div data-testid='drawer-content' className={className}>
      {children}
    </div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DrawerHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='drawer-title'>{children}</div>
  )
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div data-testid='scroll-area' className={className}>
      {children}
    </div>
  ),
  ScrollBar: (props: any) => <div data-testid='scroll-bar' {...props} />
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, style, ...props }: any) => (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  )
}));

vi.mock('@/components/ui/input-with-icon', () => ({
  InputWithIcon: ({
    value,
    onChange,
    placeholder,
    className,
    startIcon,
    ...props
  }: any) => (
    <div>
      {startIcon}
      <input
        data-testid='search-input'
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    </div>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/general/card-loader', () => ({
  __esModule: true,
  default: ({ item }: any) => (
    <div data-testid='card-loader' data-items={item}>
      Loading...
    </div>
  )
}));

vi.mock('@/components/general/content-wraper', () => ({
  __esModule: true,
  default: ({ children, className }: any) => (
    <div data-testid='content-wraper' className={className}>
      {children}
    </div>
  )
}));

vi.mock('@/components/general/empty-state', () => ({
  __esModule: true,
  default: ({ title, subtitle, className }: any) => (
    <div data-testid='empty-state' className={className}>
      <div data-testid='empty-state-title'>{title}</div>
      <div data-testid='empty-state-subtitle'>{subtitle}</div>
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <div data-testid='loading-spinner' {...props}>
      Loading...
    </div>
  )
}));

vi.mock('@/components/page-header', () => ({
  __esModule: true,
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/lib/lazy-component', async () => {
  const mod = await vi.importActual<typeof import('@/lib/lazy-component')>(
    '@/lib/lazy-component'
  );
  const React = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lazyComponent = (
    loader: () => Promise<{ default: any }>,
    _options?: any
  ) => {
    const LazyComp = React.lazy(loader);
    // eslint-disable-next-line react/display-name
    return (props: Record<string, unknown>) =>
      React.createElement(
        React.Suspense,
        {
          fallback: React.createElement('div', {
            'data-testid': 'lazy-loading'
          })
        },
        React.createElement(LazyComp, props)
      );
  };
  return { ...mod, lazyComponent };
});

// ----- data helpers -----

const createQuestionnaireEntry = (
  id: string,
  title: string,
  description?: string
) => ({
  resource: {
    id,
    resourceType: 'Questionnaire' as const,
    title,
    description: description ?? `Description for ${title}`
  }
});

const createResearchEntry = (
  id: string,
  title: string,
  description?: string
) => ({
  resource: {
    id,
    resourceType: 'ResearchStudy' as const,
    title,
    description: description ?? `Description for ${title}`,
    period: { start: '2025-01-01', end: '2025-12-31' },
    note: [{ text: '30 mins' }],
    contact: [{ name: 'Dr. Smith' }]
  },
  questionnaireIds: ['q-123']
});

// ----- component imports (after vi.mock) -----

import { useAuth } from '@/context/auth/authContext';
import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import {
  searchQuestionnaires,
  useOngoingResearch,
  usePopularAssessments,
  useRegularAssessments
} from '@/services/api/assessment';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AssessmentsList from '../app/assessments/assessments-list';

describe('AssessmentsList', () => {
  let queryClient: QueryClient;
  let mockRouterPush: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();

    mockRouterPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockRouterPush } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
    vi.mocked(usePathname).mockReturnValue('/assessments');

    // Default: patient role, not loading
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: 'patient-1',
          fullname: 'John Doe',
          email: 'john@example.com'
        }
      },
      dispatch: vi.fn()
    });

    vi.mocked(usePopularAssessments).mockReturnValue({
      data: [],
      isLoading: false
    } as any);

    vi.mocked(useRegularAssessments).mockReturnValue({
      data: [],
      isLoading: false
    } as any);

    vi.mocked(useOngoingResearch).mockReturnValue({
      data: [],
      isLoading: false
    } as any);

    vi.mocked(useSearchWithFallback).mockReturnValue({
      filteredData: [],
      isServerSearching: false,
      showServerResults: false,
      serverSearchTerm: '',
      serverData: undefined,
      serverSearchCompleted: false
    });

    vi.mocked(searchQuestionnaires).mockResolvedValue([]);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  /** Wait for lazy components to resolve. */
  const waitForLoad = () =>
    waitFor(() => {
      expect(screen.queryByTestId('lazy-loading')).toBeNull();
    });

  // ------------------------------------------------------------------
  //  1. Renders loading state when research is loading
  // ------------------------------------------------------------------
  it('renders loading state when research is loading', async () => {
    vi.mocked(useOngoingResearch).mockReturnValue({
      data: [],
      isLoading: true
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    // CardLoader appears for the research section
    const cardLoaders = screen.getAllByTestId('card-loader');
    expect(cardLoaders.length).toBeGreaterThanOrEqual(1);

    // Search input still renders
    expect(screen.getByPlaceholderText('Search Assessment')).toBeDefined();

    // Page header renders
    expect(screen.getByTestId('page-header')).toBeDefined();

    // "Popular Assessment" and "Browse Instruments" titles still appear
    expect(screen.getByText('Popular Assessment')).toBeDefined();
    expect(screen.getByText('Browse Instruments')).toBeDefined();
  });

  // ------------------------------------------------------------------
  //  2. Renders the search input
  // ------------------------------------------------------------------
  it('renders the search input', () => {
    render(<AssessmentsList />, { wrapper });

    const input = screen.getByPlaceholderText('Search Assessment');
    expect(input).toBeDefined();
  });

  // ------------------------------------------------------------------
  //  3. Renders "Ongoing Research" section with title
  // ------------------------------------------------------------------
  it('renders "Ongoing Research" section with title', async () => {
    const researchData = [createResearchEntry('research-1', 'Heart Study')];
    vi.mocked(useOngoingResearch).mockReturnValue({
      data: researchData,
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText('Ongoing Research')).toBeDefined();

    // Research card title
    expect(screen.getByText('Heart Study')).toBeDefined();

    // Participate button
    expect(screen.getByText('Participate')).toBeDefined();
  });

  // ------------------------------------------------------------------
  //  4. Renders popular assessments when data is available
  // ------------------------------------------------------------------
  it('renders popular assessments when data is available', async () => {
    const popularData = [
      createQuestionnaireEntry('pop-1', 'Popular Test 1'),
      createQuestionnaireEntry('pop-2', 'Popular Test 2')
    ];
    vi.mocked(usePopularAssessments).mockReturnValue({
      data: popularData,
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText('Popular Assessment')).toBeDefined();
    expect(screen.getByText('Popular Test 1')).toBeDefined();
    expect(screen.getByText('Popular Test 2')).toBeDefined();

    // Best Impact badge appears on every popular card (2 cards = 2 badges)
    expect(screen.getAllByText('Best Impact')).toHaveLength(2);

    // Award icon renders on every popular card (2 cards = 2 icons)
    expect(screen.getAllByTestId('award-icon')).toHaveLength(2);
  });

  // ------------------------------------------------------------------
  //  5. Renders regular/browse assessments when data is available
  // ------------------------------------------------------------------
  it('renders regular/browse assessments when data is available', async () => {
    const regularData = [
      createQuestionnaireEntry('reg-1', 'Regular Test 1'),
      createQuestionnaireEntry('reg-2', 'Regular Test 2')
    ];
    vi.mocked(useRegularAssessments).mockReturnValue({
      data: regularData,
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText('Browse Instruments')).toBeDefined();
    expect(screen.getByText('Regular Test 1')).toBeDefined();
    expect(screen.getByText('Regular Test 2')).toBeDefined();
  });

  // ------------------------------------------------------------------
  //  6. Shows empty state when no research data
  // ------------------------------------------------------------------
  it('shows empty state when no research data', async () => {
    // research data is already [] from beforeEach, loading is false
    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    // Empty state for research
    expect(screen.getByTestId('empty-state-title')).toBeDefined();
    expect(screen.getByText('No ongoing research')).toBeDefined();
    expect(
      screen.getByText(
        'There are currently no research studies available. Please check back later.'
      )
    ).toBeDefined();

    // "Ongoing Research" title still appears
    expect(screen.getByText('Ongoing Research')).toBeDefined();
  });

  // ------------------------------------------------------------------
  //  7. Shows empty state when no popular assessments
  // ------------------------------------------------------------------
  it('shows empty state when no popular assessments', async () => {
    // popularAssessments defaults to [] in beforeEach
    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    // The section heading still renders
    expect(screen.getByText('Popular Assessment')).toBeDefined();

    // No assessment card titles appear
    expect(screen.queryByText('Popular Test 1')).toBeNull();
    expect(screen.queryByText('Best Impact')).toBeNull();
  });

  // ------------------------------------------------------------------
  //  8. Drawer interaction – clicking an assessment opens the drawer
  // ------------------------------------------------------------------
  it('opens the drawer when a popular assessment is clicked', async () => {
    const popularData = [createQuestionnaireEntry('pop-1', 'Popular Test 1')];
    vi.mocked(usePopularAssessments).mockReturnValue({
      data: popularData,
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    // Initially the drawer is closed
    const drawer = screen.getByTestId('drawer');
    expect(drawer.dataset.open).toBe('false');

    // Click on the assessment card (its title text)
    fireEvent.click(screen.getByText('Popular Test 1'));

    // Drawer should now be open
    await waitFor(() => {
      expect(drawer.dataset.open).toBe('true');
    });

    // Router push was called with the correct search params
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('isDrawerOpen=true'),
      expect.objectContaining({ scroll: false })
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('assessmentId=pop-1'),
      expect.objectContaining({ scroll: false })
    );
  });

  // ------------------------------------------------------------------
  //  8b. Drawer opens via URL search params on mount
  // ------------------------------------------------------------------
  it('opens drawer based on URL search params on mount', async () => {
    const popularData = [createQuestionnaireEntry('pop-1', 'Popular Test 1')];
    vi.mocked(usePopularAssessments).mockReturnValue({
      data: popularData,
      isLoading: false
    } as any);

    // Set up search params as if the URL contains drawer=open instructions
    const params = new URLSearchParams();
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', 'pop-1');
    vi.mocked(useSearchParams).mockReturnValue(params as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    // Drawer should be open from the URL effect
    await waitFor(() => {
      const drawer = screen.getByTestId('drawer');
      expect(drawer.dataset.open).toBe('true');
    });

    // Selected assessment title appears both in the card listing and the drawer title
    expect(screen.getAllByText('Popular Test 1')).toHaveLength(2);
  });
});
