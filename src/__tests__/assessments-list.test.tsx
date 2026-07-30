/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, max-lines */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ----- global mock factories (hoisted before imports) -----

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useCuratedAssessments: vi.fn(),
  useFeaturedAssessments: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn()
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unsafe-member-access
    <img src={props.src} alt={props.alt} />
  )
}));

vi.mock('lucide-react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    Clock: (props: Record<string, string>) => (
      <svg data-testid='clock-icon' {...props} />
    ),
    SearchIcon: (props: Record<string, string>) => (
      <div data-testid='search-icon' {...props} />
    )
  };
});

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
  DrawerContent: ({ children }: any) => (
    <div data-testid='drawer-content'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => (
    <div data-testid='drawer-title'>{children}</div>
  )
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
  ScrollBar: () => null
}));

vi.mock('@/components/ui/input-with-icon', () => ({
  InputWithIcon: ({
    value,
    onChange,
    placeholder,
    startIcon
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    startIcon: React.ReactNode;
  }) => (
    <div>
      {startIcon}
      <input
        data-testid='search-input'
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}));

vi.mock('@/components/general/content-wraper', () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <div data-testid='content-wraper'>{children}</div>
  )
}));

vi.mock('@/components/general/empty-state', () => ({
  __esModule: true,
  default: ({ title, subtitle }: any) => (
    <div data-testid='empty-state'>
      <div data-testid='empty-state-title'>{title}</div>
      <div data-testid='empty-state-subtitle'>{subtitle}</div>
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
  const lazyComponent = (loader: () => Promise<{ default: any }>) => {
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

vi.mock('@/components/general/card-loader', () => ({
  __esModule: true,
  default: ({ item }: any) => (
    <div data-testid='card-loader' data-items={item}>
      Loading...
    </div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  )
}));

// ----- data helpers -----

function createQuestionnaire(
  id: string,
  title: string,
  overrides?: Partial<Questionnaire>
): Questionnaire {
  return {
    resourceType: 'Questionnaire',
    id,
    title,
    description: `Description for ${title}`,
    status: 'active',
    ...overrides
  };
}

// ----- component imports (after vi.mock) -----

import { useAuth } from '@/context/auth/authContext';
import {
  useCuratedAssessments,
  useFeaturedAssessments
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

    vi.mocked(useCuratedAssessments).mockReturnValue({
      data: [],
      isLoading: false
    } as any);

    vi.mocked(useFeaturedAssessments).mockReturnValue({
      data: [],
      isLoading: false
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const waitForLoad = () =>
    waitFor(() => {
      expect(screen.queryByTestId('lazy-loading')).toBeNull();
    });

  it('renders the search input', () => {
    render(<AssessmentsList />, { wrapper });

    expect(
      screen.getByPlaceholderText('Search Assessment')
    ).toBeInTheDocument();
  });

  it('shows Editor Picks section when featured assessments exist', async () => {
    vi.mocked(useFeaturedAssessments).mockReturnValue({
      data: [createQuestionnaire('feat-1', 'Featured Test')],
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText("Editor's Picks")).toBeInTheDocument();
    expect(screen.getByAltText('Featured Test')).toBeInTheDocument();
  });

  it('hides Editor Picks section when featured assessments is empty', async () => {
    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.queryByText("Editor's Picks")).not.toBeInTheDocument();
  });

  it('renders All Instruments grid with curated assessments', async () => {
    vi.mocked(useCuratedAssessments).mockReturnValue({
      data: [
        createQuestionnaire('cur-1', 'Instrument A'),
        createQuestionnaire('cur-2', 'Instrument B')
      ],
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText(/All Instruments/)).toBeInTheDocument();
    expect(screen.getByText('Instrument A')).toBeInTheDocument();
    expect(screen.getByText('Instrument B')).toBeInTheDocument();
  });

  it('shows empty state when no curated assessments', async () => {
    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    expect(screen.getByText('No instruments found')).toBeInTheDocument();
  });

  it('opens the drawer when a featured assessment is clicked', async () => {
    vi.mocked(useFeaturedAssessments).mockReturnValue({
      data: [createQuestionnaire('feat-1', 'Featured Test')],
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    const drawers = screen.getAllByTestId('drawer');
    expect(drawers[1]).toHaveAttribute('data-open', 'false');

    fireEvent.click(screen.getByAltText('Featured Test'));

    await waitFor(() => {
      expect(drawers[1]).toHaveAttribute('data-open', 'true');
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('isDrawerOpen=true'),
      expect.objectContaining({ scroll: false })
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('assessmentId=feat-1'),
      expect.objectContaining({ scroll: false })
    );
  });

  it('opens the drawer when a curated assessment is clicked', async () => {
    vi.mocked(useCuratedAssessments).mockReturnValue({
      data: [createQuestionnaire('cur-1', 'Instrument A')],
      isLoading: false
    } as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    const drawers = screen.getAllByTestId('drawer');
    expect(drawers[1]).toHaveAttribute('data-open', 'false');

    fireEvent.click(screen.getByText('Instrument A'));

    await waitFor(() => {
      expect(drawers[1]).toHaveAttribute('data-open', 'true');
    });
  });

  it('opens drawer based on URL search params on mount', async () => {
    vi.mocked(useCuratedAssessments).mockReturnValue({
      data: [createQuestionnaire('cur-1', 'Instrument A')],
      isLoading: false
    } as any);

    const params = new URLSearchParams();
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', 'cur-1');
    vi.mocked(useSearchParams).mockReturnValue(params as any);

    render(<AssessmentsList />, { wrapper });
    await waitForLoad();

    await waitFor(() => {
      const drawers = screen.getAllByTestId('drawer');
      expect(drawers[1]).toHaveAttribute('data-open', 'true');
    });

    // Title appears in both card listing and drawer
    expect(screen.getAllByText('Instrument A')).toHaveLength(2);
  });
});
