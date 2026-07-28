/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useQuestionnaire: vi.fn()
}));

vi.mock('@/hooks/useTodaySessions', () => ({
  useTodaySessions: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn()
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
  default: ({ pageIndicator }: any) => (
    <div data-testid='page-header'>{pageIndicator ?? 'Header'}</div>
  )
}));

vi.mock('@/components/general/fhir-forms-renderer', () => ({
  __esModule: true,
  default: () => <div data-testid='fhir-forms-renderer'>Form Renderer</div>
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

import { useAuth } from '@/context/auth/authContext';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { useQuestionnaire } from '@/services/api/assessment';
import { useSearchParams } from 'next/navigation';
import AssessmentsDetail from '../app/assessments/assessments-detail';

describe('AssessmentsDetail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();

    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=q-123') as any
    );

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: false,
        userInfo: {
          role_name: 'Patient',
          fhirId: 'patient-1',
          fullname: 'John Doe',
          email: 'john@example.com'
        }
      },
      dispatch: vi.fn()
    });

    vi.mocked(useQuestionnaire).mockReturnValue({
      data: null,
      isLoading: false
    } as any);

    vi.mocked(useTodaySessions).mockReturnValue({
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

  it('renders loading spinner when questionnaire is loading', () => {
    vi.mocked(useQuestionnaire).mockReturnValue({
      data: null,
      isLoading: true
    } as any);

    render(<AssessmentsDetail />, { wrapper });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });

  it('renders empty state when questionnaire is not found', async () => {
    render(<AssessmentsDetail />, { wrapper });

    await waitForLoad();

    expect(screen.getByTestId('empty-state-title')).toBeDefined();
    expect(screen.getByText('Questionnaire not found')).toBeDefined();
  });

  it('renders page header with title when questionnaire loads', async () => {
    vi.mocked(useQuestionnaire).mockReturnValue({
      data: [
        {
          resource: {
            id: 'q-123',
            resourceType: 'Questionnaire',
            title: 'Anxiety Test'
          }
        }
      ],
      isLoading: false
    } as any);

    render(<AssessmentsDetail />, { wrapper });
    await waitForLoad();

    // The FHIR forms renderer is lazy-loaded — we just check header renders
    expect(screen.getByTestId('page-header')).toBeDefined();
  });
});
