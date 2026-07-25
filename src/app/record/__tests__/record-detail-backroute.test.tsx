import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/record'),
  useRouter: vi.fn(() => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }))
}));
vi.mock('@/hooks/useRecordDetail', () => ({
  useRecordDetail: vi.fn()
}));
vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));
vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));
vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='mock-record-journal'>Journal</div>
}));
vi.mock('@/components/page-header', () => ({
  default: (props: { backRoute?: string }) => (
    <div data-testid='mock-page-header' data-back-route={props.backRoute ?? ''}>
      Header
    </div>
  )
}));
vi.mock('@/context/fabDirtyContext', () => ({
  useFabDirty: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import RecordDetail from '../record-detail';

describe('RecordDetail - backRoute prop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { fullname: 'John Doe', email: 'john@example.com' }
      },
      isLoading: false
    } as unknown as never);
  });

  it('passes backRoute prop to PageHeader when provided', () => {
    const mockSetDirtyState = vi.fn();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] }
      },
      isLoading: false,
      error: null
    } as unknown as never);
    vi.mocked(useFabDirty).mockReturnValue({
      setDirtyState: mockSetDirtyState
    } as unknown as never);

    render(
      <RecordDetail
        resourceType='Observation'
        resourceId='obs-1'
        backRoute='/record?id=pat-2'
      />
    );

    const pageHeader = screen.getByTestId('mock-page-header');
    expect(pageHeader.dataset.backRoute).toBe('/record?id=pat-2');
  });

  it('passes empty backRoute to PageHeader when not provided', () => {
    const mockSetDirtyState = vi.fn();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] }
      },
      isLoading: false,
      error: null
    } as unknown as never);
    vi.mocked(useFabDirty).mockReturnValue({
      setDirtyState: mockSetDirtyState
    } as unknown as never);

    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);

    const pageHeader = screen.getByTestId('mock-page-header');
    expect(pageHeader.dataset.backRoute).toBe('');
  });
});
