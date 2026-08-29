/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Fee reported by the mocked RecordAssessment, controlled per test. */
const { mockFeeRef } = vi.hoisted(
  (): {
    mockFeeRef: { current: { value: number; currency: string } | null };
  } => ({
    mockFeeRef: { current: null }
  })
);

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/record'),
  useRouter: vi.fn(() => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }))
}));
vi.mock('@/hooks/useRecordDetail', () => ({ useRecordDetail: vi.fn() }));
vi.mock('@/context/auth/authContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));
vi.mock('@/app/record/record-assessment', () => ({
  default: ({
    onFeeChange
  }: {
    onFeeChange?: (fee: { value: number; currency: string } | null) => void;
  }) => {
    setTimeout(() => onFeeChange?.(mockFeeRef.current), 0);
    return <div data-testid='mock-record-assessment'>Assessment</div>;
  }
}));
vi.mock('@/app/record/record-soap', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid='mock-record-soap'>
      SOAP
      {typeof props.onPractitionerNameChange === 'function' && (
        <span data-testid='practitioner-name-callback'>has-callback</span>
      )}
    </div>
  )
}));
vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='mock-record-journal'>Journal</div>
}));
vi.mock('@/app/record/record-condition', () => ({
  default: () => <div data-testid='mock-record-condition'>Condition</div>
}));
vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='mock-page-header'>Header</div>
}));
vi.mock('@/context/fabContext', () => ({ useFab: vi.fn() }));
vi.mock('@/components/general/modal-qr', () => ({
  default: () => <div data-testid='mock-modal-qr'>QR</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import RecordDetail from '../record-detail';

const QR_ASSESSMENT = {
  resourceType: 'QuestionnaireResponse',
  id: 'qr-1',
  questionnaire: 'Questionnaire/phq9'
};
const QR_SOAP = {
  resourceType: 'QuestionnaireResponse',
  id: 'soap-1',
  questionnaire: 'Questionnaire/soap'
};
const FEE = { value: 50_000, currency: 'IDR' };
const AUTH_USER = {
  state: {
    isAuthenticated: true,
    userInfo: { fullname: 'John Doe', email: 'john@example.com' }
  },
  isLoading: false
};

type FabDispatchCall = [
  action: { type: string; config: { label?: string } | null }
];

function mockDispatch() {
  const dispatch = vi.fn();
  vi.mocked(useFab).mockReturnValue({
    state: { action: null, selection: null, menu: null, panelOpen: false },
    dispatch
  });
  return dispatch;
}

function mockDetail(data: Record<string, unknown> | null) {
  vi.mocked(useRecordDetail).mockReturnValue({
    data,
    isLoading: false,
    error: null
  } as any);
}

function findActionCall(dispatch: ReturnType<typeof vi.fn>, label: string) {
  return dispatch.mock.calls.find((c: unknown[]) => {
    const action = (c as FabDispatchCall)[0];
    return action?.type === 'SET_ACTION' && action?.config?.label === label;
  }) as FabDispatchCall | undefined;
}

function lastActionLabel(
  dispatch: ReturnType<typeof vi.fn>
): string | undefined {
  return dispatch.mock.calls
    .map((c: unknown[]) => (c as FabDispatchCall)[0])
    .findLast(a => a?.type === 'SET_ACTION' && a?.config?.label != null)?.config
    ?.label;
}

describe('RecordDetail - dispatches by resourceType + content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeeRef.current = null;
    vi.mocked(useAuth).mockReturnValue(AUTH_USER as any);
  });

  it('sets FAB to Share Record for QuestionnaireResponse view', () => {
    const dispatch = mockDispatch();
    mockDetail(QR_ASSESSMENT);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(findActionCall(dispatch, 'Share Record')).toBeDefined();
  });

  it('sets FAB to Share Record for Practitioner Note view', () => {
    const dispatch = mockDispatch();
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-1',
      code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(findActionCall(dispatch, 'Share Record')).toBeDefined();
  });

  it('clears FAB action state for non-own journal view', () => {
    const dispatch = mockDispatch();
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-1',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      subject: { reference: 'Patient/other-user' }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    const nullCalls = dispatch.mock.calls.filter((c: unknown[]) => {
      const action = (c as FabDispatchCall)[0];
      return action?.type === 'SET_ACTION' && action?.config === null;
    });
    expect(nullCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('sets FAB to Edit for own journal', () => {
    const dispatch = mockDispatch();
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          fullname: 'John Doe',
          email: 'john@example.com',
          fhirId: 'user-123'
        }
      },
      isLoading: false
    } as any);
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-1',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      subject: { reference: 'Patient/user-123' }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(findActionCall(dispatch, 'Edit')).toBeDefined();
  });

  it('clears FAB action state on unmount', () => {
    const dispatch = mockDispatch();
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-1',
      code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
    });
    const { unmount } = render(
      <RecordDetail resourceType='Observation' resourceId='obs-1' />
    );
    unmount();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACTION',
      config: null
    });
  });

  it('renders RecordAssessment for non-SOAP QuestionnaireResponse', () => {
    mockDetail(QR_ASSESSMENT);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByTestId('mock-record-assessment')).toBeInTheDocument();
  });

  it('renders RecordSoap for SOAP QuestionnaireResponse', () => {
    mockDetail(QR_SOAP);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders RecordJournal for Observation LOINC 51855-5', () => {
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-1',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(screen.getByTestId('mock-record-journal')).toBeInTheDocument();
  });

  it('renders RecordSoap for Observation LOINC 67855-7', () => {
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-2',
      code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-2' />);
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders RecordCondition for Condition resource type', () => {
    mockDetail({
      resourceType: 'Condition',
      id: 'cond-1',
      evidence: [{ code: [{ text: 'wadu' }] }]
    });
    render(<RecordDetail resourceType='Condition' resourceId='cond-1' />);
    expect(screen.getByTestId('mock-record-condition')).toBeInTheDocument();
  });

  it('passes onPractitionerNameChange to RecordSoap for Practitioner Note', () => {
    mockDetail({
      resourceType: 'Observation',
      id: 'obs-2',
      code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
    });
    render(<RecordDetail resourceType='Observation' resourceId='obs-2' />);
    expect(
      screen.getByTestId('practitioner-name-callback')
    ).toBeInTheDocument();
  });

  it('renders Notfound for unknown resourceType', () => {
    mockDetail(null);
    render(<RecordDetail resourceType='UnknownType' resourceId='x' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound when resourceId is empty', () => {
    render(<RecordDetail resourceType='Observation' resourceId='' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders patient display name from auth context', () => {
    mockDetail(QR_ASSESSMENT);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('sets FAB to Get Report for non-SOAP QR with a fee', async () => {
    const dispatch = mockDispatch();
    mockFeeRef.current = FEE;
    mockDetail(QR_ASSESSMENT);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    await waitFor(() => {
      expect(findActionCall(dispatch, 'Get Report')).toBeDefined();
    });
  });

  it('keeps Share Record for guest users even with a fee', async () => {
    const dispatch = mockDispatch();
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: { role_name: 'Guest' } },
      isLoading: false
    } as any);
    mockFeeRef.current = FEE;
    mockDetail(QR_ASSESSMENT);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    await waitFor(() => {
      expect(findActionCall(dispatch, 'Share Record')).toBeDefined();
      expect(findActionCall(dispatch, 'Get Report')).toBeUndefined();
    });
  });

  it('keeps Share Record for SOAP QR even with a previously reported fee', async () => {
    const dispatch = mockDispatch();
    mockFeeRef.current = FEE;
    mockDetail(QR_ASSESSMENT);
    const { rerender } = render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    await waitFor(() => {
      expect(findActionCall(dispatch, 'Get Report')).toBeDefined();
    });
    mockDetail(QR_SOAP);
    rerender(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='soap-1' />
    );
    await waitFor(() => {
      expect(lastActionLabel(dispatch)).toBe('Share Record');
    });
  });
});
