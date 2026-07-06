/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn().mockReturnValue({ back: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator, backRoute }: any) => (
    <div
      data-testid='mock-page-header'
      data-back-route={backRoute ?? ''}
      data-indicator={pageIndicator}
    >
      {pageIndicator}
    </div>
  )
}));

vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));

vi.mock('@/app/record/record-assessment', () => ({
  default: () => <div data-testid='mock-record-assessment'>Assessment</div>
}));

vi.mock('@/app/record/record-exercise', () => ({
  default: () => <div data-testid='mock-record-exercise'>Exercise</div>
}));

vi.mock('@/app/record/record-soap', () => ({
  default: () => <div data-testid='mock-record-soap'>SOAP</div>
}));

vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='mock-record-journal'>Journal</div>
}));

vi.mock('@/utils/helper', () => ({
  formatTitle: vi
    .fn()
    .mockImplementation((title: string) => title?.replace(/-/g, ' ') ?? '')
}));

import { useSearchParams } from 'next/navigation';
import RecordDetail from '../record-detail';

describe('RecordDetail - back navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [1, 'PHQ-9', 'Assessment Result'],
    [2, 'Push-ups', 'Exercise Result'],
    [3, 'SOAP-Note', 'SOAP Detail'],
    [4, 'My-Journal', 'Journal Detail']
  ])('renders %s page without backRoute', (category, title, expected) => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(`id=xxx&category=${category}&title=${title}`) as any
    );

    render(<RecordDetail />);

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', expected);
  });

  it('renders Notfound for invalid category', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=resp-123&category=99&title=Test') as any
    );

    render(<RecordDetail />);

    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound for empty title', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=resp-123&category=1&title=') as any
    );

    render(<RecordDetail />);

    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });
});
