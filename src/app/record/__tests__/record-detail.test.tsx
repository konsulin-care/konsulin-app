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

  it('renders assessment result page without backRoute', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=resp-123&category=1&title=PHQ-9') as any
    );

    render(<RecordDetail />);

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'Assessment Result');
  });

  it('renders exercise result page without backRoute', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=resp-456&category=2&title=Push-ups') as any
    );

    render(<RecordDetail />);

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'Exercise Result');
  });

  it('renders SOAP detail page without backRoute', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=soap-789&category=3&title=SOAP-Note') as any
    );

    render(<RecordDetail />);

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'SOAP Detail');
  });

  it('renders journal detail page without backRoute', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=journ-111&category=4&title=My-Journal'
      ) as any
    );

    render(<RecordDetail />);

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'Journal Detail');
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
