import { saveIntent } from '@/utils/redirect-intent';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClaimReport } from '../useClaimReport';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/utils/redirect-intent', () => ({
  saveIntent: vi.fn()
}));

describe('useClaimReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves an intent with path and qrId', () => {
    const { result } = renderHook(() =>
      useClaimReport({ path: '/report?id=r', qrId: 'q1' })
    );
    result.current();
    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/report?id=r',
      qrId: 'q1'
    });
  });

  it('saves path only and navigates to auth', () => {
    const { result } = renderHook(() => useClaimReport({ path: '/report' }));
    result.current();
    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/report'
    });
    expect(mockPush).toHaveBeenCalledWith('/auth?redirectToPath=/report');
  });
});
