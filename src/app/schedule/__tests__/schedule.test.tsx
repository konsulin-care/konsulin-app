/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import SchedulePageShell from '@/components/shared/schedule-page-shell';
import { IUseClinicParams } from '@/services/clinic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock IntersectionObserver
const mockIntersectionObserve = vi.fn();
const mockIntersectionDisconnect = vi.fn();

class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  callback: IntersectionObserverCallback;

  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }

  observe(target: Element) {
    mockIntersectionObserve(target);
    // Simulate intersection
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }

  unobserve() {
    void 0;
  }
  disconnect() {
    mockIntersectionDisconnect();
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

interface MockScheduleItem {
  appointmentId: string;
}

function makeItems(ids: string[]): MockScheduleItem[] {
  return ids.map(id => ({ appointmentId: id }));
}

// Mock child components
vi.mock('@/components/general/empty-state', () => ({
  default: ({ title, subtitle }: { title?: string; subtitle?: string }) => (
    <div data-testid='mock-empty-state'>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ count, className }: { count?: number; className?: string }) => (
    <div data-testid='mock-skeleton' data-count={count} className={className}>
      Loading...
    </div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <span data-testid='mock-badge' className={className}>
      {children}
    </span>
  )
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
}

describe('SchedulePageShell - infinite scroll', () => {
  let queryClient: QueryClient;
  let onLoadMore: (...args: never[]) => void;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    onLoadMore = vi.fn() as any;
    mockIntersectionObserve.mockReset();
    mockIntersectionDisconnect.mockReset();
  });

  const dummyFilter: IUseClinicParams = {};

  it('renders upcoming and past tabs', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={[]}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    expect(screen.getByText('Upcoming Session')).toBeDefined();
    expect(screen.getByText('Past Session')).toBeDefined();
  });

  it('shows empty state when no upcoming sessions', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={[]}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    expect(screen.getByText('No Upcoming Sessions')).toBeDefined();
  });

  it('renders loading skeleton when isLoading', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={true}
        upcoming={[]}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    expect(screen.getByTestId('mock-skeleton')).toBeDefined();
  });

  it('renders cards for upcoming items', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={makeItems(['1', '2'])}
        past={[]}
        renderCard={item => (
          <div key={item.appointmentId}>Appt {item.appointmentId}</div>
        )}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    expect(screen.getByText('Appt 1')).toBeDefined();
    expect(screen.getByText('Appt 2')).toBeDefined();
  });

  it('shows loading spinner when isLoadingMore', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={makeItems(['1'])}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoadingMore={true}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    // The sentinel with spinner should be visible
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('renders sentinel when hasMore is true', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={makeItems(['1'])}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoadingMore={false}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    // Sentinel should trigger observe
    expect(mockIntersectionObserve).toHaveBeenCalled();
  });

  it('does not render sentinel when hasMore is false', () => {
    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={dummyFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={makeItems(['1'])}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
        onLoadMore={onLoadMore}
        hasMore={false}
        isLoadingMore={false}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    expect(mockIntersectionObserve).not.toHaveBeenCalled();
  });
});

describe('ScheduleDetail - useAppointment', () => {
  let queryClient: QueryClient;
  let localFilter: IUseClinicParams;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    localFilter = {};
  });

  it('SchedulePageShell calls onLoadMore when sentinel intersects', () => {
    const onLoadMore = vi.fn() as any;

    render(
      <SchedulePageShell
        keyword=''
        onKeywordChange={vi.fn()}
        sessionsFilter={localFilter}
        onFilterChange={vi.fn()}
        selectedTab='upcoming'
        onTabChange={vi.fn()}
        isLoading={false}
        upcoming={makeItems(['1'])}
        past={[]}
        renderCard={item => <div key={item.appointmentId}>Card</div>}
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoadingMore={false}
      />,
      { wrapper: createWrapper(queryClient) }
    );

    // Mock IntersectionObserver triggers callback, which should call onLoadMore
    expect(onLoadMore).toHaveBeenCalled();
  });
});
