import { render } from '@testing-library/react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FabAction } from '@/context/fabContext';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() })
}));

vi.mock('@/context/fabContext', () => ({
  useFab: vi.fn()
}));

vi.mock('@/utils/redirect-intent', () => ({
  saveIntent: vi.fn()
}));

vi.mock('lucide-react', () => ({
  BookCheck: () => <div data-testid='book-check-icon' />
}));

import { useFab } from '@/context/fabContext';
import { saveIntent } from '@/utils/redirect-intent';
import ClaimReportFab from '../claim-report-fab';

const mockDispatch = vi.fn<Dispatch<FabAction>>();

function findClaimAction(
  calls: readonly unknown[][]
): Extract<FabAction, { type: 'SET_ACTION' }> | undefined {
  return calls.find(([action]) => {
    const fabAction = action as FabAction;
    return (
      fabAction.type === 'SET_ACTION' &&
      fabAction.config?.label === 'Claim Report'
    );
  })?.[0] as Extract<FabAction, { type: 'SET_ACTION' }> | undefined;
}

describe('ClaimReportFab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFab).mockReturnValue({
      state: { action: null, selection: null, menu: null, panelOpen: false },
      dispatch: mockDispatch
    });
  });

  it('dispatches a primary BookCheck action labelled "Claim Report" when visible', () => {
    render(<ClaimReportFab path='/report?id=research' visible />);

    const action = findClaimAction(mockDispatch.mock.calls);
    expect(action).toBeDefined();
    expect(action?.config.variant).toBe('primary');
    expect(action?.config.icon).toBeDefined();
    expect(typeof action?.config.onAction).toBe('function');
  });

  it('clears the FAB action on unmount', () => {
    const { unmount } = render(
      <ClaimReportFab path='/report?id=research' visible />
    );
    mockDispatch.mockClear();
    unmount();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTION',
      config: null
    });
  });

  it('saves the report intent and redirects to auth when the action fires', () => {
    render(<ClaimReportFab path='/report?id=research' visible />);

    const action = findClaimAction(mockDispatch.mock.calls);
    // deepsource:ignore JS-0098 — invoke claim action in test without awaiting
    void action?.config.onAction();

    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/report?id=research'
    });
    expect(mockPush).toHaveBeenCalledWith(
      '/auth?redirectToPath=/report?id=research'
    );
  });

  it('passes the qrId through for single-result draft cleanup', () => {
    render(<ClaimReportFab path='/record' qrId='qr-9' visible />);

    const action = findClaimAction(mockDispatch.mock.calls);
    // deepsource:ignore JS-0098 — invoke claim action in test without awaiting
    void action?.config.onAction();

    expect(saveIntent).toHaveBeenCalledWith('assessmentResult', {
      path: '/record',
      qrId: 'qr-9'
    });
  });

  it('dispatches no action when not visible', () => {
    render(<ClaimReportFab path='/report?id=research' visible={false} />);

    expect(findClaimAction(mockDispatch.mock.calls)).toBeUndefined();
  });
});
