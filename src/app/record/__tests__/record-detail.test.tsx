/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  default: () => <div data-testid='mock-record-assessment'>Assessment</div>
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

describe('RecordDetail - dispatches by resourceType + content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { fullname: 'John Doe', email: 'john@example.com' }
      },
      isLoading: false
    } as any);
  });

  function mockDispatch() {
    const d = vi.fn();
    vi.mocked(useFab).mockReturnValue({
      state: { action: null, selection: null, menu: null, panelOpen: false },
      dispatch: d
    } as any);
    return d;
  }

  type FabDispatchCall = [
    action: { type: string; config: { label?: string } | null }
  ];

  function findActionCall(dispatch: ReturnType<typeof vi.fn>, label: string) {
    return dispatch.mock.calls.find((c: unknown[]) => {
      const action = (c as FabDispatchCall)[0];
      return action?.type === 'SET_ACTION' && action?.config?.label === label;
    }) as FabDispatchCall | undefined;
  }

  it('sets FAB to Share Record for QuestionnaireResponse view', () => {
    const dispatch = mockDispatch();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/phq9'
      },
      isLoading: false,
      error: null
    } as any);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(findActionCall(dispatch, 'Share Record')).toBeDefined();
  });

  it('sets FAB to Share Record for Practitioner Note view', () => {
    const dispatch = mockDispatch();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(findActionCall(dispatch, 'Share Record')).toBeDefined();
  });

  it('clears FAB action state for non-own journal view', () => {
    const dispatch = mockDispatch();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
        subject: { reference: 'Patient/other-user' }
      },
      isLoading: false,
      error: null
    } as any);
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
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
        subject: { reference: 'Patient/user-123' }
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(findActionCall(dispatch, 'Edit')).toBeDefined();
  });

  it('clears FAB action state on unmount', () => {
    const dispatch = mockDispatch();
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
      },
      isLoading: false,
      error: null
    } as any);
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
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/phq9'
      },
      isLoading: false,
      error: null
    } as any);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByTestId('mock-record-assessment')).toBeInTheDocument();
  });

  it('renders RecordSoap for SOAP QuestionnaireResponse', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/soap'
      },
      isLoading: false,
      error: null
    } as any);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders RecordJournal for Observation LOINC 51855-5', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] }
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Observation' resourceId='obs-1' />);
    expect(screen.getByTestId('mock-record-journal')).toBeInTheDocument();
  });

  it('renders RecordSoap for Observation LOINC 67855-7', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-2',
        code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Observation' resourceId='obs-2' />);
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders RecordCondition for Condition resource type', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Condition',
        id: 'cond-1',
        evidence: [{ code: [{ text: 'wadu' }] }]
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Condition' resourceId='cond-1' />);
    expect(screen.getByTestId('mock-record-condition')).toBeInTheDocument();
  });

  it('passes onPractitionerNameChange to RecordSoap for Practitioner Note', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-2',
        code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
      },
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='Observation' resourceId='obs-2' />);
    expect(
      screen.getByTestId('practitioner-name-callback')
    ).toBeInTheDocument();
  });

  it('renders Notfound for unknown resourceType', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as any);
    render(<RecordDetail resourceType='UnknownType' resourceId='x' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound when resourceId is empty', () => {
    render(<RecordDetail resourceType='Observation' resourceId='' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders patient display name from auth context', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/phq9'
      },
      isLoading: false,
      error: null
    } as any);
    render(
      <RecordDetail resourceType='QuestionnaireResponse' resourceId='qr-1' />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
